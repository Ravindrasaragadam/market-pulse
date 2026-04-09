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

        try:
            response = self.client.chat.completions.create(
                model=NIM_MODEL,
                messages=[{"role": "user", "content": content}],
                max_tokens=500,
                temperature=0.2
            )
            return response.choices[0].message.content
        except Exception as e:
            print(f"Error analyzing market state: {e}")
            return f"Unable to generate market state report due to API error: {str(e)}. Please check NVIDIA NIM API connection and try again."

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

        try:
            response = self.client.chat.completions.create(
                model=NIM_MODEL,
                messages=[{"role": "user", "content": content}],
                max_tokens=800,
                temperature=0.2
            )
            return response.choices[0].message.content
        except Exception as e:
            print(f"Error analyzing India market: {e}")
            return f"Unable to generate India market report due to API error: {str(e)}. Please check NVIDIA NIM API connection and try again."
    
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

        try:
            response = self.client.chat.completions.create(
                model=NIM_MODEL,
                messages=[{"role": "user", "content": content}],
                max_tokens=800,
                temperature=0.2
            )
            return response.choices[0].message.content
        except Exception as e:
            print(f"Error analyzing US market: {e}")
            return f"Unable to generate US market report due to API error: {str(e)}. Please check NVIDIA NIM API connection and try again."
    
    def analyze_daily_summary(self, research_data):
        """
        Creates a comprehensive daily market summary.
        """
        content = [
            {"type": "text", "text": self._build_daily_summary_prompt(research_data)}
        ]

        try:
            response = self.client.chat.completions.create(
                model=NIM_MODEL,
                messages=[{"role": "user", "content": content}],
                max_tokens=1000,
                temperature=0.2
            )
            return response.choices[0].message.content
        except Exception as e:
            print(f"Error analyzing daily summary: {e}")
            return f"Unable to generate daily summary due to API error: {str(e)}. Please check NVIDIA NIM API connection and try again."

    def analyze_telegram_summary(self, research_data, report_type="INDIA"):
        """Analyze data for short Telegram summary."""
        try:
            prompt = self._build_telegram_summary_prompt(research_data, report_type)
            response = self.client.chat.completions.create(
                model=NIM_MODEL,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.7
            )
            return response.choices[0].message.content
        except Exception as e:
            print(f"Error analyzing telegram summary: {e}")
            return f"Unable to generate telegram summary due to API error: {str(e)}. Please check NVIDIA NIM API connection and try again."
    
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
        recent_news_str = "\n".join([f"- [{n['headline']}]({n['link']}) ({n['source']})" for n in data.get('recent_news', [])])
        focus_str = "\n".join([f"- [{n['headline']}]({n['link']}) ({n['source']})" for n in data.get('focus_news', [])])
        commodities_str = "\n".join([f"- [{n['headline']}]({n['link']}) ({n['source']})" for n in data.get('commodities_news', [])])
        
        prompt = f"""
You are the 'Market Pulse' India Market Analyst. Think like an experienced human trader and analyst who has studied markets for 20+ years. Your goal is to help humans make BETTER decisions, not just report data.

### MISSION:
Provide a structured India market report that helps investors make informed decisions:

1. **Stock-Level Alerts (3-5 specific insights)**: For each alert, follow this format:
   - **Event/News**: What happened (e.g., "Surge in oil imports", "IT Q4 results expected Friday")
   - **Analysis**: Why this matters and what it signals (e.g., "This can trigger price spikes in next quarter")
   - **Related Stocks**: Specific stocks that will be impacted (e.g., "OIL, ONGC, RELIANCE")
   - **Action**: Buy/Sell/Hold with reasoning
   
   Example format:
   - **Surge in oil imports**: This can trigger price spikes in next quarter as well. Related stocks: OIL, ONGC, RELIANCE. Action: Consider long positions on oil stocks.
   - **IT industries Q4 results**: Negative signals for service companies due to AI boom. Related stocks: TCS, INFY, WIPRO. Action: Reduce exposure to traditional IT services.

2. **Market Trends**: Higher-level market psychology and sentiment analysis
3. **Focus Area Analysis ({FOCUS_KEYWORDS})**: Deep analysis of focus sectors with opportunities and risks
4. **Commodities & Macro**: How gold/silver movements impact markets
5. **Pattern Recognition**: Unusual patterns or correlations

### THINK LIKE A HUMAN ANALYST:
- Connect specific news to specific stocks
- Provide actionable stock-level alerts, not generic market commentary
- Consider second-order effects: "If X happens, what stocks benefit?"
- Identify stocks that will be positively or negatively impacted
- Provide clear Buy/Sell/Hold recommendations with reasoning
- Think about what a trader needs to know RIGHT NOW to make decisions

### CRITICAL RULES:
- ONLY use data provided in the sections below. Do NOT hallucinate or invent any market data.
- Stock alerts must be specific and actionable with related stock symbols
- Do NOT report on DJIA, S&P 500, Nasdaq unless explicitly mentioned in news.
- URLs are already embedded as markdown hyperlinks.
- Do NOT add a separate References section.
- Focus on STOCK-LEVEL insights, not generic market commentary.

---

### Recent News (Last 30 Mins):
{recent_news_str if recent_news_str else "No recent news in last 30 minutes."}

### Focus Area News:
{focus_str if focus_str else "No focus area news found."}

### Commodities News:
{commodities_str if commodities_str else "No commodities news available."}

### Price Movements:
{moves_str if moves_str else "No significant moves detected."}
"""
        return prompt
    
    def _build_us_prompt(self, data):
        moves_str = "\n".join([f"- {m['symbol']}: {m['change']}% at ${m['price']}" for m in data['moves']])
        global_news_str = "\n".join([f"- [{n['headline']}]({n['link']}) ({n['source']})" for n in data.get('global_news', [])])
        focus_str = "\n".join([f"- [{n['headline']}]({n['link']}) ({n['source']})" for n in data.get('focus_news', [])])
        
        prompt = f"""
You are the 'Market Pulse' US/International Market Analyst. Think like an experienced human trader and analyst who has studied markets for 20+ years. Your goal is to help humans make BETTER decisions, not just report data.

### MISSION:
Provide a structured US market report that helps investors make informed decisions:

1. **Stock-Level Alerts (3-5 specific insights)**: For each alert, follow this format:
   - **Event/News**: What happened (e.g., "Fed rate hike concerns", "Tech sector earnings beat")
   - **Analysis**: Why this matters and what it signals (e.g., "This can trigger rotation to defensive stocks")
   - **Related Stocks**: Specific stocks that will be impacted (e.g., "AAPL, MSFT, NVDA")
   - **Action**: Buy/Sell/Hold with reasoning
   
   Example format:
   - **Biotech AI boom**: Raising boom in AI-driven biotech sector. Related stocks: JDH, ASIH, ASCH. Action: Consider positions in AI biotech leaders.
   - **Fed rate hike concerns**: Rising yields impacting growth stocks. Related stocks: TSLA, NVDA, AMD. Action: Reduce exposure to high-growth tech stocks temporarily.

2. **Market Trends**: Higher-level market psychology and sentiment analysis
3. **Focus Area Analysis ({FOCUS_KEYWORDS})**: Deep analysis of focus sectors with opportunities and risks
4. **Global Market Analysis**: International developments and their impact on US stocks
5. **Pattern Recognition**: Unusual patterns or correlations

### THINK LIKE A HUMAN ANALYST:
- Connect specific news to specific stocks
- Provide actionable stock-level alerts, not generic market commentary
- Consider second-order effects: "If X happens, what stocks benefit?"
- Identify stocks that will be positively or negatively impacted
- Provide clear Buy/Sell/Hold recommendations with reasoning
- Think about what a trader needs to know RIGHT NOW to make decisions
- Consider how global events impact specific US stocks

### CRITICAL RULES:
- ONLY use data provided in the sections below. Do NOT hallucinate or invent any market data.
- Stock alerts must be specific and actionable with related stock symbols
- Do NOT report on DJIA, S&P 500, Nasdaq unless explicitly mentioned in news.
- URLs are already embedded as markdown hyperlinks.
- Do NOT add a separate References section.
- Focus on STOCK-LEVEL insights, not generic market commentary.

---

### Global News:
{global_news_str if global_news_str else "No global news available."}

### Focus Area News:
{focus_str if focus_str else "No focus area news found."}

### Price Movements:
{moves_str if moves_str else "No significant moves detected."}
"""
        return prompt
    
    def _build_daily_summary_prompt(self, data):
        moves_str = "\n".join([f"- {m['symbol']}: {m['change']}% at ${m['price']}" for m in data['moves']])
        news_str = "\n".join([f"- [{n['headline']}]({n['link']}) ({n['source']})" for n in data['local_news'] + data['global_news']])
        focus_str = "\n".join([f"- [{n['headline']}]({n['link']}) ({n['source']})" for n in data.get('focus_news', [])])
        
        prompt = f"""
You are the 'Market Pulse' Daily Summary Analyst. Think like an experienced human trader and analyst who has studied markets for 20+ years. Your goal is to help humans make BETTER decisions, not just report data.

### MISSION:
Provide a comprehensive end-of-day market summary that helps investors make informed decisions:

1. **Day's Key Stories**: 5-7 MOST IMPORTANT developments - focus on what matters for tomorrow's trading
2. **Market Performance Analysis**: What today's performance tells us about market health and direction
3. **Sector Deep Dive ({FOCUS_KEYWORDS})**: Identify opportunities, risks, and what to watch in focus sectors
4. **Key Movers Analysis**: Explain WHY best/worst performers moved - not just that they moved
5. **Pattern Recognition**: Identify trends, divergences, or unusual behavior that could signal future moves
6. **Tomorrow's Playbook**: Specific things to watch and actionable items for the next trading day

### THINK LIKE A HUMAN ANALYST:
- Connect today's events to tomorrow's opportunities
- Identify what's noise vs what's signal
- Consider risk factors that aren't obvious
- Look for patterns that could repeat
- Provide context: "This matters because..."
- Ask what a smart investor would do differently tomorrow
- Prioritize actionable takeaways over generic summaries
- Consider contrarian views if the crowd is extreme

### CRITICAL RULES:
- ONLY use data provided in the sections below. Do NOT hallucinate or invent any market data, index movements, or statistics.
- Do NOT report on DJIA, S&P 500, Nasdaq, or any other indices unless they are explicitly mentioned in the news.
- Do NOT make up percentage changes or market movements.
- URLs are already embedded as markdown hyperlinks in the news items.
- Do NOT add a separate References section at the end.
- Think deeply about implications and future impacts.
- If something seems unusual, explain WHY it matters.
- Be specific about what to watch for tomorrow.

---

### All Market News:
{news_str if news_str else "No major news headlines."}

### Focus Area News:
{focus_str if focus_str else "No focus area news found."}

### Price Movements:
{moves_str if moves_str else "No significant moves detected."}
"""
        return prompt
    
    def _build_telegram_summary_prompt(self, data, report_type="INDIA"):
        """Build prompt for generating short Telegram-friendly summary."""
        moves_str = "\n".join([f"- {m['symbol']}: {m['change']}% at ${m['price']}" for m in data['moves']])
        
        flag = "🇮🇳" if report_type == "INDIA" else "🇺🇸"
        market = "India" if report_type == "INDIA" else "US/International"
        
        prompt = f"""
You are the 'Market Pulse' Telegram Summary Generator. Your mission is to create a SHORT, PUNCHY summary for Telegram.

### MISSION:
Generate a concise Telegram message with the following structure:

{flag} {market} Market Pulse

🔥 HOT SIGNALS:
• [SYMBOL]: [BUY/SELL/NEUTRAL] ([+/-X.X]%) - [ONE-LINE REASONING]
• [SYMBOL]: [BUY/SELL/NEUTRAL] ([+/-X.X]%) - [ONE-LINE REASONING]
• [SYMBOL]: [BUY/SELL/NEUTRAL] ([+/-X.X]%) - [ONE-LINE REASONING]

📊 MARKET: [BULLISH/BEARISH/NEUTRAL] - [ONE-SENTENCE SUMMARY]

🔗 View Details: [DASHBOARD URL]

### CRITICAL RULES:
- Extract ONLY the most important stock signals from the data (max 5)
- Keep each bullet point to ONE LINE
- Use emojis for visual appeal
- Include percentage changes
- Keep the entire message under 300 characters if possible
- Focus on actionable signals, not general news
- Use BUY/SELL/NEUTRAL in caps
- Make it skimmable and quick to read

### Price Movements:
{moves_str if moves_str else "No significant moves detected."}

### Output Format:
Provide ONLY the Telegram message, no other text.
"""
        return prompt
    
    def extract_stock_signals(self, analysis_text):
        """Extract individual stock signals from the full analysis text."""
        import re
        
        signals = []
        # Pattern to match stock symbols with signals
        # This is a simple pattern - can be improved with more sophisticated parsing
        lines = analysis_text.split('\n')
        
        for line in lines:
            # Look for patterns like "TCS: BUY (+2.5%)" or "INFY: SELL (-1.2%)"
            match = re.search(r'([A-Z]+):?\s*(BUY|SELL|NEUTRAL)\s*([+-]?\d+\.?\d*%?)', line, re.IGNORECASE)
            if match:
                symbol = match.group(1).upper()
                signal = match.group(2).upper()
                change = match.group(3)
                
                signals.append({
                    'symbol': symbol,
                    'signal': signal,
                    'change': change,
                    'reasoning': line.strip()
                })
        
        return signals
