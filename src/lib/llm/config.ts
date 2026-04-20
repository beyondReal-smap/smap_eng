export const OLLAMA_BASE_URL =
  process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434';

export const OLLAMA_MODEL =
  process.env.OLLAMA_MODEL ??
  'hf.co/unsloth/gemma-4-E4B-it-GGUF:UD-Q4_K_XL';
