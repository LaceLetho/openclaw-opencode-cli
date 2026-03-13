export function getEnvVar(name: string, required = false): string | undefined {
  const value = process.env[name];
  if (required && !value) {
    throw new Error(`Environment variable ${name} is required`);
  }
  return value;
}

export function requireEnvVar(name: string): string {
  const value = getEnvVar(name);
  if (!value) {
    throw new Error(`Environment variable ${name} is required`);
  }
  return value;
}
