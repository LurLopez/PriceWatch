export type LogLevel = 'info' | 'warn' | 'error';

/**
 * Log estructurado en una línea JSON. Evita incluir cuerpos de solicitud,
 * tokens o contraseñas; solo metadatos operativos.
 */
export function logStructured(
  level: LogLevel,
  message: string,
  context: Record<string, unknown> = {},
): void {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    service: 'pricewatch-api',
    message,
    ...context,
  };
  const line = JSON.stringify(entry);

  if (level === 'error') {
    console.error(line);
    return;
  }
  if (level === 'warn') {
    console.warn(line);
    return;
  }
  console.log(line);
}
