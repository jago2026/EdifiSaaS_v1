import crypto from 'crypto';

export function generateHash(
  tipo: string,
  fecha: number,
  descripcion: string,
  monto: number,
  extras: Record<string, any> = {}
): string {
  const data = `${tipo}|${fecha}|${descripcion}|${monto}|${JSON.stringify(extras)}`;
  return crypto.createHash('sha256').update(data).digest('hex');
}

export function encrypt(text: string): string {
  const key = process.env.ENCRYPTION_KEY || 'edifisaas-default-key-32chars!!!';
  const keyBuffer = Buffer.from(key.substring(0, 32).padEnd(32, '0'));
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', keyBuffer, iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

export function decrypt(text: string): string {
  const key = process.env.ENCRYPTION_KEY || 'edifisaas-default-key-32chars!!!';
  const keyBuffer = Buffer.from(key.substring(0, 32).padEnd(32, '0'));
  const [ivHex, encryptedHex] = text.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const encrypted = Buffer.from(encryptedHex, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', keyBuffer, iv);
  let decrypted = decipher.update(encrypted);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
}
