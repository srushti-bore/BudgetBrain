"""
BudgetBrain — AI Provider Factory

Environment-driven factory that dynamically instantiates the chosen LLM provider.
Ensures zero hardcoding and seamless swapping between Gemini, OpenAI, Claude, and local rules.
"""

from app.config import Settings, get_settings
from app.services.ai.anthropic_provider import AnthropicProvider
from app.services.ai.base import BaseLLMProvider
from app.services.ai.gemini_provider import GeminiProvider
from app.services.ai.openai_provider import OpenAIProvider
from app.services.ai.rules_provider import RulesProvider


def get_ai_provider(settings: Settings | None = None) -> BaseLLMProvider:
    """
    Resolves and returns the configured AI provider based on environment variables.
    Falls back gracefully to RulesProvider if the selected provider key is missing.
    """
    if settings is None:
        settings = get_settings()

    provider_choice = (settings.AI_PROVIDER or "gemini").lower().strip()
    model_override = settings.AI_MODEL.strip() if settings.AI_MODEL else None
    temp = settings.AI_TEMPERATURE

    if provider_choice == "gemini":
        if settings.GEMINI_API_KEY:
            return GeminiProvider(api_key=settings.GEMINI_API_KEY, model_name=model_override, temperature=temp)
        print("[AI Factory] GEMINI_API_KEY not configured. Falling back to zero-cost rules provider.")
        return RulesProvider(model_name=model_override, temperature=temp)

    elif provider_choice == "openai":
        if settings.OPENAI_API_KEY:
            return OpenAIProvider(
                api_key=settings.OPENAI_API_KEY,
                base_url=settings.OPENAI_BASE_URL,
                model_name=model_override,
                temperature=temp,
            )
        print("[AI Factory] OPENAI_API_KEY not configured. Falling back to zero-cost rules provider.")
        return RulesProvider(model_name=model_override, temperature=temp)

    elif provider_choice in ["anthropic", "claude"]:
        if settings.ANTHROPIC_API_KEY:
            return AnthropicProvider(api_key=settings.ANTHROPIC_API_KEY, model_name=model_override, temperature=temp)
        print("[AI Factory] ANTHROPIC_API_KEY not configured. Falling back to zero-cost rules provider.")
        return RulesProvider(model_name=model_override, temperature=temp)

    # Explicit 'rules' or unmatched provider
    return RulesProvider(model_name=model_override, temperature=temp)
