import base64
import time
from openai import OpenAI
from .config import (
    NVIDIA_NIM_API_KEY, NIM_BASE_URL, NIM_MODEL, MODEL_CONFIG,
    FOCUS_KEYWORDS
)

class AIAnalyzer:
    def __init__(self):
        self.client = OpenAI(
            base_url=NIM_BASE_URL,
            api_key=NVIDIA_NIM_API_KEY
        )

    def encode_image(self, image_path):
        with open(image_path, "rb") as image_file:
            return base64.b64encode(image_file.read()).decode('utf-8')

    def _call_nim_with_retry(self, messages, max_tokens=800, temperature=0.2, max_retries=3, retry_delay=30, model_key='market_summary'):
        """Call NVIDIA NIM API with retry logic and model selection."""
        # Use appropriate model based on task type
        model = MODEL_CONFIG.get(model_key, NIM_MODEL)
        print(f"Using model '{model}' for task '{model_key}'")

        for attempt in range(max_retries):
            try:
                response = self.client.chat.completions.create(
                    model=model,
                    messages=messages,
                    max_tokens=max_tokens,
                    temperature=temperature
                )
                return response.choices[0].message.content
            except Exception as e:
                print(f"NIM API attempt {attempt + 1}/{max_retries} failed: {e}")
                if attempt < max_retries - 1:
                    print(f"Waiting {retry_delay} seconds before retry...")
                    time.sleep(retry_delay)
                else:
                    return f"Unable to generate report due to API error: {str(e)}. Please check NVIDIA NIM API connection."
        return None

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

        return self._call_nim_with_retry(
            messages=[{"role": "user", "content": content}],
            max_tokens=500,
            temperature=0.2
        )

    def analyze_india_market(self, india_data, image_path=None, dynamic_focus_areas=None):
        """
        Analyzes India-specific market data with dedicated sections.
        Uses stock_analysis model for financial focused analysis.
        """
        content = [
            {"type": "text", "text": self._build_india_prompt(india_data, dynamic_focus_areas)}
        ]

        if image_path:
            base64_image = self.encode_image(image_path)
            content.append({
                "type": "image_url",
                "image_url": {"url": f"data:image/jpeg;base64,{base64_image}"}
            })

        return self._call_nim_with_retry(
            messages=[{"role": "user", "content": content}],
            max_tokens=800,
            temperature=0.2,
            model_key='stock_analysis'
        )

    def analyze_us_market(self, us_data, image_path=None, dynamic_focus_areas=None):
        """
        Analyzes US/International market data.
        Uses stock_analysis model for financial focused analysis.
        """
        content = [
            {"type": "text", "text": self._build_us_prompt(us_data, dynamic_focus_areas)}
        ]

        if image_path:
            base64_image = self.encode_image(image_path)
            content.append({
                "type": "image_url",
                "image_url": {"url": f"data:image/jpeg;base64,{base64_image}"}
            })

        return self._call_nim_with_retry(
            messages=[{"role": "user", "content": content}],
            max_tokens=800,
            temperature=0.2,
            model_key='stock_analysis'
        )
    
    def analyze_daily_summary(self, research_data):
        """
        Creates a comprehensive daily market summary.
        """
        content = [
            {"type": "text", "text": self._build_daily_summary_prompt(research_data)}
        ]

        return self._call_nim_with_retry(
            messages=[{"role": "user", "content": content}],
            max_tokens=1000,
            temperature=0.2
        )

    def analyze_telegram_summary(self, research_data, report_type="INDIA"):
        """Analyze data for short Telegram summary."""
        prompt = self._build_telegram_summary_prompt(research_data, report_type)
        return self._call_nim_with_retry(
            messages=[{"role": "user", "content": prompt}],
            max_tokens=500,
            temperature=0.7
        )

    def analyze_focus_areas(self, research_data, current_focus_areas, market_conditions=""):
        """Analyze market data to suggest dynamic focus areas based on trends.

        Returns a list of suggested focus areas with priority and rationale.
        """
        moves_str = "\n".join([f"- {m['symbol']}: {m['change']}%" for m in research_data.get('moves', [])])
        news_str = "\n".join([f"- {n['headline']} ({n['source']})" for n in research_data.get('local_news', []) + research_data.get('global_news', [])])
        current_focus = ", ".join(current_focus_areas) if current_focus_areas else "None"

        prompt = f"""
You are a market trend analyst. Based on the current market data, identify the most important sectors, themes, and trends that investors should focus on.

### CURRENT FOCUS AREAS:
{current_focus}

### MARKET CONDITIONS:
{market_conditions}

### DATA TO ANALYZE:
**Price Movements:**
{moves_str if moves_str else "No significant price movements"}

**Recent News:**
{news_str if news_str else "No recent news"}

### YOUR TASK:
Identify 5-7 key focus areas that are currently trending or important based on:
1. Sectors showing significant price movements
2. Recurring themes in news headlines
3. Emerging trends that could impact markets
4. Event-driven opportunities (earnings, policy changes, global events)
5. Asset classes showing unusual activity

### OUTPUT FORMAT:
Return ONLY a JSON array of focus areas in this exact format:
[
  {{
    "keyword": "sector or theme name",
    "category": "SECTOR/THEME/EVENT/ASSET_CLASS",
    "priority": 8,
    "rationale": "Brief explanation of why this matters now",
    "market_context": "TRENDING_UP/MARKET_CORRECTION/EMERGING/etc"
  }}
]

Guidelines:
- Priority: 1-10, higher = more urgent/important
- Category: Use specific types like SECTOR (IT, Banking), THEME (AI, EV), EVENT (Earnings, Budget), ASSET_CLASS (Gold, Crypto)
- Keep keywords concise (1-3 words)
- Rationale should explain current market relevance
- Consider both existing trends and emerging opportunities
"""
        response = self._call_nim_with_retry(
            messages=[{"role": "user", "content": prompt}],
            max_tokens=800,
            temperature=0.3
        )

        # Parse the JSON response
        import json
        import re
        try:
            # Try to extract JSON from the response
            json_match = re.search(r'\[.*\]', response, re.DOTALL)
            if json_match:
                focus_areas = json.loads(json_match.group())
                return focus_areas
            else:
                # If no JSON found, return empty list
                print(f"Could not parse focus areas from response: {response[:200]}")
                return []
        except Exception as e:
            print(f"Error parsing focus areas: {e}")
            return []

    def detect_market_correction(self, research_data):
        """Detect if market is in correction phase or significant movement."""
        moves = research_data.get('moves', [])

        if not moves:
            return False, ""

        # Count significant movements (>3% or <-3%)
        significant_moves = [m for m in moves if abs(m.get('change', 0)) >= 3.0]
        negative_moves = [m for m in moves if m.get('change', 0) <= -2.0]
        positive_moves = [m for m in moves if m.get('change', 0) >= 2.0]

        # Correction: More than 30% of stocks down >2%
        if len(moves) > 0 and len(negative_moves) / len(moves) >= 0.3:
            return True, f"Market correction detected: {len(negative_moves)}/{len(moves)} stocks down >2%"

        # Strong uptrend: More than 40% of stocks up >2%
        if len(moves) > 0 and len(positive_moves) / len(moves) >= 0.4:
            return True, f"Strong uptrend detected: {len(positive_moves)}/{len(moves)} stocks up >2%"

        # High volatility: More than 25% significant moves
        if len(moves) > 0 and len(significant_moves) / len(moves) >= 0.25:
            return True, f"High volatility detected: {len(significant_moves)}/{len(moves)} stocks with >3% moves"

        return False, "Normal market conditions"

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
    
    def _build_india_prompt(self, data, dynamic_focus_areas=None):
        moves_str = "\n".join([f"- {m['symbol']}: {m['change']}% at ${m['price']}" for m in data['moves']])
        recent_news_str = "\n".join([f"- [{n['headline']}]({n['link']}) ({n['source']})" for n in data.get('recent_news', [])])
        focus_str = "\n".join([f"- [{n['headline']}]({n['link']}) ({n['source']})" for n in data.get('focus_news', [])])
        commodities_str = "\n".join([f"- [{n['headline']}]({n['link']}) ({n['source']})" for n in data.get('commodities_news', [])])

        # Use dynamic focus areas if provided, otherwise fall back to config
        if dynamic_focus_areas and len(dynamic_focus_areas) > 0:
            focus_keywords = ", ".join([f"{fa['keyword']} (Priority: {fa.get('priority', 5)})" for fa in dynamic_focus_areas])
        else:
            focus_keywords = FOCUS_KEYWORDS

        prompt = f"""
You are the 'Market Pulse' India Market Analyst. Think like an experienced human trader and analyst who has studied markets for 20+ years. Your goal is to help humans make BETTER decisions, not just report data.

### MISSION:
Provide a structured India market report that helps investors make informed decisions:

1. **Stock-Level Alerts**: Provide 3-5 specific stock-level alerts in this format:
   - Stock symbol, full company name
   - Signal: BUY/SELL/HOLD with clear reasoning
   - Focus area tags (sector/theme)
   - Confidence level (0-1)

   ALSO include a JSON array at the end of your response:
   ```json
   [
     {{
       "symbol": "RELIANCE",
       "stock_name": "Reliance Industries Ltd",
       "signal": "BUY",
       "reasoning": "Oil price surge expected due to OPEC+ cuts, refining margins expanding",
       "focus_areas": ["Energy", "Oil", "Large Cap"],
       "confidence": 0.85
     }}
   ]
   ```

2. **Market Trends**: Higher-level market psychology and sentiment analysis
3. **Focus Area Analysis ({focus_keywords})**: Deep analysis of focus sectors with opportunities and risks. Pay special attention to high-priority focus areas.
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
    
    def _build_us_prompt(self, data, dynamic_focus_areas=None):
        moves_str = "\n".join([f"- {m['symbol']}: {m['change']}% at ${m['price']}" for m in data['moves']])
        global_news_str = "\n".join([f"- [{n['headline']}]({n['link']}) ({n['source']})" for n in data.get('global_news', [])])
        focus_str = "\n".join([f"- [{n['headline']}]({n['link']}) ({n['source']})" for n in data.get('focus_news', [])])

        # Use dynamic focus areas if provided, otherwise fall back to config
        if dynamic_focus_areas and len(dynamic_focus_areas) > 0:
            focus_keywords = ", ".join([f"{fa['keyword']} (Priority: {fa.get('priority', 5)})" for fa in dynamic_focus_areas])
        else:
            focus_keywords = FOCUS_KEYWORDS

        prompt = f"""
You are the 'Market Pulse' US/International Market Analyst. Think like an experienced human trader and analyst who has studied markets for 20+ years. Your goal is to help humans make BETTER decisions, not just report data.

### MISSION:
Provide a structured US market report that helps investors make informed decisions:

1. **Stock-Level Alerts**: Provide 3-5 specific stock-level alerts in this format:
   - Stock symbol, full company name
   - Signal: BUY/SELL/HOLD with clear reasoning
   - Focus area tags (sector/theme)
   - Confidence level (0-1)

   ALSO include a JSON array at the end of your response:
   ```json
   [
     {{
       "symbol": "AAPL",
       "stock_name": "Apple Inc",
       "signal": "BUY",
       "reasoning": "Strong iPhone 16 demand and AI integration timeline boosting sentiment",
       "focus_areas": ["Technology", "Consumer Electronics", "AI Theme"],
       "confidence": 0.82
     }}
   ]
   ```

2. **Market Trends**: Higher-level market psychology and sentiment analysis
3. **Focus Area Analysis ({focus_keywords})**: Deep analysis of focus sectors with opportunities and risks. Pay special attention to high-priority focus areas.
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
    
    def extract_stock_signals(self, analysis_text, focus_areas=None):
        """Extract individual stock signals from the full analysis text."""
        import re
        import json
        
        signals = []
        
        # First, try to find JSON formatted signals
        # Look for patterns like ```json ... ``` or just [...]
        json_match = re.search(r'```json\s*(\[.*?\])\s*```', analysis_text, re.DOTALL)
        if not json_match:
            json_match = re.search(r'(\[\s*\{.*?\}\s*\])', analysis_text, re.DOTALL)
        
        if json_match:
            try:
                json_str = json_match.group(1)
                parsed_signals = json.loads(json_str)
                if isinstance(parsed_signals, list):
                    for signal in parsed_signals:
                        if 'symbol' in signal and 'signal' in signal:
                            signals.append({
                                'symbol': signal.get('symbol'),
                                'stock_name': signal.get('stock_name', ''),
                                'signal': signal.get('signal', 'NEUTRAL').upper(),
                                'reasoning': signal.get('reasoning', signal.get('reason', '')),
                                'focus_areas': signal.get('focus_areas', signal.get('tags', [])),
                                'confidence': signal.get('confidence', 0.7),
                                'stop_loss': signal.get('stop_loss'),
                                'target': signal.get('target_price', signal.get('target'))
                            })
                    return signals
            except json.JSONDecodeError:
                pass  # Fall back to text parsing
        
        # Text-based parsing as fallback
        lines = analysis_text.split('\n')
        
        for line in lines:
            # Look for patterns like "TCS: BUY (+2.5%)" or "INFY: SELL (-1.2%)"
            match = re.search(r'([A-Z]+):?\s*(BUY|SELL|NEUTRAL)\s*([+-]?\d+\.?\d*%?)', line, re.IGNORECASE)
            if match:
                symbol = match.group(1).upper()
                signal = match.group(2).upper()
                change = match.group(3)
                
                # Try to extract tags/focus areas from line
                focus_tags = []
                if focus_areas:
                    for fa in focus_areas:
                        keyword = fa.get('keyword', '')
                        if keyword and keyword.lower() in line.lower():
                            focus_tags.append(keyword)
                
                signals.append({
                    'symbol': symbol,
                    'signal': signal,
                    'change': change,
                    'reasoning': line.strip(),
                    'focus_areas': focus_tags[:3],  # Max 3 tags
                    'confidence': 0.7
                })
        
        return signals
