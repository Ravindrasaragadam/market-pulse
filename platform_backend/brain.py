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
    
    def analyze_india_market(self, india_data, image_path=None):
        """
        Analyzes India-specific market data with dedicated sections.
        """
        content = [
            {"type": "text", "text": self._build_india_prompt(india_data)}
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
            max_tokens=800,
            temperature=0.2
        )
        
        return response.choices[0].message.content
    
    def analyze_us_market(self, us_data, image_path=None):
        """
        Analyzes US/International market data.
        """
        content = [
            {"type": "text", "text": self._build_us_prompt(us_data)}
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
            max_tokens=800,
            temperature=0.2
        )
        
        return response.choices[0].message.content
    
    def analyze_daily_summary(self, research_data):
        """
        Creates a comprehensive daily market summary.
        """
        content = [
            {"type": "text", "text": self._build_daily_summary_prompt(research_data)}
        ]

        response = self.client.chat.completions.create(
            model=NIM_MODEL,
            messages=[{"role": "user", "content": content}],
            max_tokens=1000,
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
    
    def _build_india_prompt(self, data):
        moves_str = "\n".join([f"- {m['symbol']}: {m['change']}% at ${m['price']}" for m in data['moves']])
        recent_news_str = "\n".join([f"- [{i+1}] {n['headline']} ({n['source']})" for i, n in enumerate(data.get('recent_news', []))])
        focus_str = "\n".join([f"- [{i+1}] {n['headline']} ({n['source']})" for i, n in enumerate(data.get('focus_news', []))])
        commodities_str = "\n".join([f"- [{i+1}] {n['headline']} ({n['source']})" for i, n in enumerate(data.get('commodities_news', []))])
        
        # Collect all references
        all_news = data.get('recent_news', []) + data.get('focus_news', []) + data.get('commodities_news', [])
        references = "\n".join([f"[{i+1}] {n['link']}" for i, n in enumerate(all_news)])
        
        prompt = f"""
You are the 'Market Pulse' India Market Analyst. Your mission is to provide a focused India market report.

### MISSION:
Provide a structured India market report with the following sections:

1. **Top Highlights (Last 30 Minutes)**: 3-4 bullet points summarizing key market events from the last 30 minutes
2. **Focus Area News**: Analysis of news related to {FOCUS_KEYWORDS}
3. **Commodities Update**: Gold and silver price movements and news
4. **Market Sentiments**: Overall bullish/bearish sentiment with reasoning
5. **Special/Interesting Patterns**: Identify any unusual patterns or trends from the data
6. **Watchlist Updates**: Brief updates on watchlist stocks

### CRITICAL RULES:
- ONLY use data provided in the sections below. Do NOT hallucinate or invent any market data, index movements, or statistics.
- Do NOT report on DJIA, S&P 500, Nasdaq, or any other indices unless they are explicitly mentioned in the news.
- Do NOT make up percentage changes or market movements.
- Use numbered references [1], [2], etc. in the text for news items.
- List all reference URLs at the end under 'References' section.
- Analyze patterns and trends from the context, not just report headlines.
- Look for unusual market behavior or interesting correlations.
- Format with clear section headers and bullet points.
- Keep each section concise but informative.

---

### Recent News (Last 30 Mins):
{recent_news_str if recent_news_str else "No recent news in last 30 minutes."}

### Focus Area News:
{focus_str if focus_str else "No focus area news found."}

### Commodities News:
{commodities_str if commodities_str else "No commodities news available."}

### Price Movements:
{moves_str if moves_str else "No significant moves detected."}

### References:
{references if references else "No references available."}
"""
        return prompt
    
    def _build_us_prompt(self, data):
        moves_str = "\n".join([f"- {m['symbol']}: {m['change']}% at ${m['price']}" for m in data['moves']])
        global_news_str = "\n".join([f"- [{i+1}] {n['headline']} ({n['source']})" for i, n in enumerate(data.get('global_news', []))])
        focus_str = "\n".join([f"- [{i+1}] {n['headline']} ({n['source']})" for i, n in enumerate(data.get('focus_news', []))])
        
        # Collect all references
        all_news = data.get('global_news', []) + data.get('focus_news', [])
        references = "\n".join([f"[{i+1}] {n['link']}" for i, n in enumerate(all_news)])
        
        prompt = f"""
You are the 'Market Pulse' US/International Market Analyst. Your mission is to provide a focused international market report.

### MISSION:
Provide a structured US/International market report with the following sections:

1. **US Market Overview**: Key US market movements and trends (ONLY from provided news)
2. **International Highlights**: Major global market events (ONLY from provided news)
3. **Focus Sector Analysis**: Analysis of {FOCUS_KEYWORDS} in international context
4. **Market Sentiments**: Overall bullish/bearish sentiment with reasoning
5. **Special Patterns**: Identify any unusual patterns or trends
6. **Watchlist Updates**: Brief updates on international watchlist stocks

### CRITICAL RULES:
- ONLY use data provided in the sections below. Do NOT hallucinate or invent any market data, index movements, or statistics.
- Do NOT report on DJIA, S&P 500, Nasdaq, or any other indices unless they are explicitly mentioned in the news.
- Do NOT make up percentage changes or market movements.
- Use numbered references [1], [2], etc. in the text for news items.
- List all reference URLs at the end under 'References' section.
- Analyze patterns and trends from the context.
- Look for unusual market behavior or interesting correlations.
- Format with clear section headers and bullet points.

---

### Global News:
{global_news_str if global_news_str else "No global news available."}

### Focus Area News:
{focus_str if focus_str else "No focus area news found."}

### Price Movements:
{moves_str if moves_str else "No significant moves detected."}

### References:
{references if references else "No references available."}
"""
        return prompt
    
    def _build_daily_summary_prompt(self, data):
        moves_str = "\n".join([f"- {m['symbol']}: {m['change']}% at ${m['price']}" for m in data['moves']])
        news_str = "\n".join([f"- [{i+1}] {n['headline']} ({n['source']})" for i, n in enumerate(data['local_news'] + data['global_news'])])
        focus_str = "\n".join([f"- [{i+1}] {n['headline']} ({n['source']})" for i, n in enumerate(data.get('focus_news', []))])
        
        # Collect all references
        all_news = data['local_news'] + data['global_news'] + data.get('focus_news', [])
        references = "\n".join([f"[{i+1}] {n['link']}" for i, n in enumerate(all_news)])
        
        prompt = f"""
You are the 'Market Pulse' Daily Summary Analyst. Your mission is to provide a comprehensive end-of-day market summary.

### MISSION:
Provide a comprehensive daily market summary covering:

1. **Day's Top Stories**: 5-7 most important market events of the day
2. **Market Performance**: Overall market performance summary (ONLY from provided data)
3. **Sector Analysis**: Deep dive into {FOCUS_KEYWORDS} performance
4. **Key Movers**: Best and worst performers from watchlist
5. **Trends and Patterns**: Important trends or patterns observed today
6. **Tomorrow's Outlook**: What to watch for tomorrow

### CRITICAL RULES:
- ONLY use data provided in the sections below. Do NOT hallucinate or invent any market data, index movements, or statistics.
- Do NOT report on DJIA, S&P 500, Nasdaq, or any other indices unless they are explicitly mentioned in the news.
- Do NOT make up percentage changes or market movements.
- Use numbered references [1], [2], etc. in the text for news items.
- List all reference URLs at the end under 'References' section.
- Provide actionable insights.
- Highlight any significant changes or breaking patterns.
- Format with clear section headers.
- Be comprehensive but concise.

---

### All Market News:
{news_str if news_str else "No major news headlines."}

### Focus Area News:
{focus_str if focus_str else "No focus area news found."}

### Price Movements:
{moves_str if moves_str else "No significant moves detected."}

### References:
{references if references else "No references available."}
"""
        return prompt
