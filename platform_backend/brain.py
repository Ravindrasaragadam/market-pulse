import base64
from openai import OpenAI
from .config import NVIDIA_NIM_API_KEY, NIM_BASE_URL, NIM_MODEL, FOCUS_KEYWORDS

class AIAnalyzer:
    def __init__(self):
        self.client = OpenAI(
            base_url=NIM_BASE_URL,
            api_key=NVIDIA_NIM_API_KEY
        )

    def encode_image(self, image_path):
        with open(image_path, "rb") as image_file:
            return base64.b64encode(image_file.read()).decode('utf-8')

    def analyze_market_state(self, research_data, image_path=None):
        """
        Uses NVIDIA NIM to analyze news, price moves, and charts.
        """
        content = [
            {"type": "text", "text": self._build_prompt(research_data)}
        ]

        if image_path:
            base64_image = self.encode_image(image_path)
            content.append({
                "type": "image_url",
                "image_url": {"url": f"data:image/jpeg;base64,{base64_image}"}
            })

        response = self.client.chat.completions.create(
            model=NIM_MODEL,
            messages=[{"role": "user", "content": content}],
            max_tokens=500,
            temperature=0.2
        )
        
        return response.choices[0].message.content

    def _build_prompt(self, data):
        moves_str = "\n".join([f"- {m['symbol']}: {m['change']}% at ${m['price']}" for m in data['moves']])
        news_str = "\n".join([f"- {n['headline']} ({n['source']}) | Link: {n['link']}" for n in data['local_news'] + data['global_news']])
        focus_str = "\n".join([f"- {n['headline']} ({n['source']}) | Link: {n['link']}" for n in data.get('focus_news', [])])
        
        prompt = f"""
You are the 'Market Pulse' AI Lead Analyst. Your mission is to provide a comprehensive, high-fidelity market summary.

### MISSION:
Provide a 3-part intelligence report based on the provided data:
1. **Macro Pulse**: A broad summary of the global and Indian market sentiment. Mention major indices or news trends.
2. **Watchlist Insights**: Short, specific updates for each stock in the 'Price Movements' list below. Mention their price and % change.
3. **Sector Spotlight**: Deep analysis of the focus sectors: {FOCUS_KEYWORDS}. Use the 'Sector-Specific Focus News' provided.

### IMPORTANT:
- Include source URLs (provided in the links) so the user can read more.
- If a stock or sector has no specific news, explain the current price action instead.
- If an image (technical chart) is provided, incorporate it into the most relevant section.
- Format with bold headers and bullet points for Telegram readability.

---

### Sector-Specific Focus News:
{focus_str if focus_str else "No targeted news found for focus sectors today."}

### Price Movements (Watchlist Stats):
{moves_str if moves_str else "No significant moves detected."}

### Broad Market News:
{news_str if news_str else "No major news headlines."}
"""
        return prompt
