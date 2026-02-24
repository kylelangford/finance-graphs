export interface DescriptionCleaningResult {
  success: boolean;
  cleanedDescriptions: string[];
  error?: string;
}

/**
 * Validate API key format (basic check)
 */
export function validateApiKey(apiKey: string): boolean {
  if (!apiKey || typeof apiKey !== 'string') {
    return false;
  }
  // Anthropic API keys typically start with 'sk-ant-'
  return apiKey.startsWith('sk-ant-') && apiKey.length > 20;
}

/**
 * Clean transaction descriptions using Claude AI via API endpoint
 */
export async function cleanDescriptions(
  descriptions: string[],
  apiKey: string,
  customPrompt?: string
): Promise<DescriptionCleaningResult> {
  try {
    // Validate user-provided API key (if not empty, it must be valid)
    if (apiKey && !validateApiKey(apiKey)) {
      return {
        success: false,
        cleanedDescriptions: [],
        error: 'Invalid API key format. API keys should start with "sk-ant-"',
      };
    }

    // Validate input
    if (!descriptions || descriptions.length === 0) {
      return {
        success: true,
        cleanedDescriptions: [],
      };
    }

    // Call our API endpoint (server-side proxy)
    // If apiKey is empty, server will use CLAUDE_API_KEY from .env
    const response = await fetch('/api/clean-descriptions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        descriptions,
        userApiKey: apiKey || undefined, // Send user's API key if provided
        customPrompt: customPrompt || undefined, // Send custom prompt if provided
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      return {
        success: false,
        cleanedDescriptions: [],
        error: errorData.error || 'Failed to clean descriptions',
      };
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error cleaning descriptions with Claude:', error);

    let errorMessage = 'Failed to clean descriptions with AI';
    if (error instanceof Error) {
      errorMessage = error.message;
    }

    return {
      success: false,
      cleanedDescriptions: [],
      error: errorMessage,
    };
  }
}
