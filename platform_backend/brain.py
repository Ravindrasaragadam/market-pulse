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
        moves_str = "\n".join([f"- {m['symbol']}: {m['change']}% at {m['price']}" for m in data['moves']])
        news_str = "\n".join([f"- {n['headline']} ({n['source']})" for n in data['local_news'] + data['global_news']])
        
        prompt = f"""
Analyze the following market data and provide a concise 'Market Signal'.
Focus on Indian equity markets, but prioritize these specific areas of interest:
{FOCUS_KEYWORDS if FOCUS_KEYWORDS else "General Market Trends"}

Identify and alert for any 'Market Corrections' or 'Big Moves' in these sectors.

### Price Movements:
{moves_str if moves_str else "No significant moves detected."}

### Recent News:
{news_str if news_str else "No major news headlines."}

### Task:
1. Identify if any of the above news/moves affect the user's investments.
2. If an image is attached, interpret the technical chart.
3. Provide a clear signal: [STRONG BUY / BUY / NEUTRAL / SELL / STRONG SELL].
4. Predict if a major market shift is incoming.

Output Format:
SIGNAL: [Type]
REASONING: [1-2 sentences]
ALERT: [True/False if immediate attention needed]
"""
        return prompt
