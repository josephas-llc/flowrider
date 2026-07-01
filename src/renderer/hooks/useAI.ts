import { useState, useEffect, useCallback } from 'react';

export interface ProviderStatus {
  claude: { available: boolean; version?: string; error?: string };
  ollama: { available: boolean; models?: string[]; error?: string };
}

export interface AICallResult {
  success: boolean;
  content?: string;
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  cost?: number;
  model?: string;
  provider: string;
  error?: string;
  duration?: number;
}

export function useAI() {
  const [providerStatus, setProviderStatus] = useState<ProviderStatus>({
    claude: { available: false },
    ollama: { available: false },
  });
  const [ollamaModels, setOllamaModels] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Check provider health on mount
  useEffect(() => {
    const checkProviders = async () => {
      if (!window.flowrider?.ai) {
        console.warn('[useAI] AI service not available');
        setLoading(false);
        return;
      }

      try {
        const result = await window.flowrider.ai.checkProviders();
        if (result.success && result.data) {
          const newStatus: ProviderStatus = {
            claude: { available: false },
            ollama: { available: false },
          };

          for (const health of result.data) {
            if (health.provider === 'claude') {
              newStatus.claude = {
                available: health.available,
                version: health.version,
                error: health.error,
              };
            } else if (health.provider === 'ollama') {
              newStatus.ollama = {
                available: health.available,
                models: health.models,
                error: health.error,
              };
              if (health.models) {
                setOllamaModels(health.models);
              }
            }
          }

          setProviderStatus(newStatus);
        }
      } catch (err) {
        console.error('[useAI] Failed to check providers:', err);
      } finally {
        setLoading(false);
      }
    };

    checkProviders();
  }, []);

  // Refresh provider status
  const refreshStatus = useCallback(async () => {
    if (!window.flowrider?.ai) return;

    setLoading(true);
    try {
      const result = await window.flowrider.ai.checkProviders();
      if (result.success && result.data) {
        const newStatus: ProviderStatus = {
          claude: { available: false },
          ollama: { available: false },
        };

        for (const health of result.data) {
          if (health.provider === 'claude') {
            newStatus.claude = {
              available: health.available,
              version: health.version,
              error: health.error,
            };
          } else if (health.provider === 'ollama') {
            newStatus.ollama = {
              available: health.available,
              models: health.models,
              error: health.error,
            };
            if (health.models) {
              setOllamaModels(health.models);
            }
          }
        }

        setProviderStatus(newStatus);
      }
    } catch (err) {
      console.error('[useAI] Failed to refresh providers:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Call an AI provider
  const call = useCallback(async (
    provider: 'claude' | 'ollama',
    prompt: string,
    options?: {
      model?: string;
      systemPrompt?: string;
      maxTokens?: number;
      temperature?: number;
    }
  ): Promise<AICallResult> => {
    if (!window.flowrider?.ai) {
      return {
        success: false,
        provider,
        error: 'AI service not available',
      };
    }

    try {
      const messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }> = [];

      if (options?.systemPrompt) {
        messages.push({ role: 'system', content: options.systemPrompt });
      }
      messages.push({ role: 'user', content: prompt });

      const result = await window.flowrider.ai.call({
        provider,
        model: options?.model,
        messages,
        maxTokens: options?.maxTokens,
        temperature: options?.temperature,
      });

      return result;
    } catch (err) {
      return {
        success: false,
        provider,
        error: (err as Error).message,
      };
    }
  }, []);

  // Quick prompt (convenience method)
  const quickPrompt = useCallback(async (
    provider: 'claude' | 'ollama',
    prompt: string,
    model?: string
  ): Promise<AICallResult> => {
    if (!window.flowrider?.ai) {
      return {
        success: false,
        provider,
        error: 'AI service not available',
      };
    }

    try {
      return await window.flowrider.ai.quickPrompt(provider, prompt, model);
    } catch (err) {
      return {
        success: false,
        provider,
        error: (err as Error).message,
      };
    }
  }, []);

  // Get available Ollama models
  const fetchOllamaModels = useCallback(async () => {
    if (!window.flowrider?.ai) return [];

    try {
      const result = await window.flowrider.ai.listOllamaModels();
      if (result.success && result.data) {
        const models = result.data.map(m => m.name);
        setOllamaModels(models);
        return models;
      }
    } catch (err) {
      console.error('[useAI] Failed to fetch Ollama models:', err);
    }
    return [];
  }, []);

  return {
    providerStatus,
    ollamaModels,
    loading,
    refreshStatus,
    call,
    quickPrompt,
    fetchOllamaModels,
  };
}
