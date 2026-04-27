#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Advanced Market Data Collection with Real APIs
Real Korean Stock Data + arXiv Papers Integration
"""

import os
import json
import requests
from datetime import datetime, timedelta
from typing import List, Dict, Tuple, Any
import feedparser
from bs4 import BeautifulSoup
import logging
import re

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger(__name__)

# ==================== Korean Market Data Collection (Advanced) ====================

class KoreanMarketDataAdvanced:
    """Advanced collection of Korean stock market data"""

    _CONFIG_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'stocks_config.json')

    try:
        with open(_CONFIG_PATH, 'r', encoding='utf-8') as _f:
            _config = json.load(_f)
            SECTOR_STOCKS: Dict[str, Dict[str, List[str]]] = _config.get('sectors', {})
            WATCHLIST: List[str] = _config.get('watchlist', [])
    except FileNotFoundError:
        logger.warning("stocks_config.json not found — sector list will be empty")
        SECTOR_STOCKS = {}
        WATCHLIST = []
    except Exception as _e:
        logger.error(f"Failed to load stocks_config.json: {_e}")
        SECTOR_STOCKS = {}
        WATCHLIST = []

    @classmethod
    def _classify_trending_stocks(cls, stock_names: List[str]) -> Dict[str, Any]:
        """Cross-reference trending stock names against configured sectors and watchlist."""
        result: Dict[str, Any] = {'sectors': {}, 'watchlist_hits': []}
        for name in stock_names:
            if any(name in w or w in name for w in cls.WATCHLIST):
                result['watchlist_hits'].append(name)
            for sector, groups in cls.SECTOR_STOCKS.items():
                all_stocks = groups.get('korean', []) + groups.get('global', [])
                if any(name in s or s in name for s in all_stocks):
                    result['sectors'].setdefault(sector, []).append(name)
        return result

    @classmethod
    def get_real_market_data(cls) -> Dict[str, Any]:
        """
        Crawl market data from Naver Finance.
        """
        market_data: Dict[str, Any] = {
            'kospi': {'index': 'N/A', 'change': 'N/A'},
            'kosdaq': {'index': 'N/A', 'change': 'N/A'},
            'sectors': {}
        }
        
        try:
            url = "https://finance.naver.com/"
            res = requests.get(url, timeout=5)
            # Handle Korean encoding
            res.encoding = 'euc-kr' 
            soup = BeautifulSoup(res.text, "html.parser")
            
            # KOSPI & KOSDAQ
            kospi_val = soup.select_one(".kospi_area .num")
            kospi_change = soup.select_one(".kospi_area .num2")
            kospi_pct = soup.select_one(".kospi_area .num3")
            if kospi_val and kospi_change and kospi_pct:
                sign = "-" if "-" in kospi_pct.text else "+"
                market_data['kospi'] = {'index': kospi_val.text.strip(), 'change': f"{sign}{kospi_change.text.strip()} ({kospi_pct.text.strip()})"}
                
            kosdaq_val = soup.select_one(".kosdaq_area .num")
            kosdaq_change = soup.select_one(".kosdaq_area .num2")
            kosdaq_pct = soup.select_one(".kosdaq_area .num3")
            if kosdaq_val and kosdaq_change and kosdaq_pct:
                sign = "-" if "-" in kosdaq_pct.text else "+"
                market_data['kosdaq'] = {'index': kosdaq_val.text.strip(), 'change': f"{sign}{kosdaq_change.text.strip()} ({kosdaq_pct.text.strip()})"}
                
            # Top Searched Stocks
            pop_list = soup.select("#container > div.aside > div > div.aside_area.aside_popular > table > tbody > tr > th > a")
            top_stocks = [a.text for a in pop_list[:5]]
            
            # Top Volume Stocks
            quant_list = soup.select("#_topItems1 tr th a")
            quant_stocks = [a.text for a in quant_list[:5]]
            
            all_trending = list(dict.fromkeys(top_stocks + quant_stocks))
            market_data['classification'] = cls._classify_trending_stocks(all_trending)

            market_data['sectors'] = {
                '🔥 Top Searched Stocks': {
                    'top_items': top_stocks,
                    'description': 'Real-time trending search queries on Naver Finance'
                },
                '📈 Top Volume Stocks': {
                    'top_items': quant_stocks,
                    'description': 'Top stocks by trading volume today'
                }
            }
            
        except Exception as e:
            logger.warning(f"Market data crawl failed: {e}")
            
        return market_data

# ==================== arXiv Paper Collection (Advanced) ====================

class AdvancedArxivCollector:
    """arXiv paper collection and filtering"""

    BASE_URL = "http://export.arxiv.org/api/query?"

    _QUERIES_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'arxiv_queries.json')

    try:
        with open(_QUERIES_PATH, 'r', encoding='utf-8') as _f:
            QUERIES: Dict[str, str] = json.load(_f).get('queries', {})
    except FileNotFoundError:
        logger.warning("arxiv_queries.json not found — query list will be empty")
        QUERIES = {}
    except Exception as _e:
        logger.error(f"Failed to load arxiv_queries.json: {_e}")
        QUERIES = {}
    
    @staticmethod
    def search_papers(query: str, max_results: int = 5) -> List[Dict]:
        """arXiv search and sort results"""
        try:
            params = {
                'search_query': query,
                'start': 0,
                'max_results': max_results,
                'sortBy': 'submittedDate',
                'sortOrder': 'descending'
            }
            
            response = requests.get(
                AdvancedArxivCollector.BASE_URL,
                params=params,
                timeout=15
            )
            response.encoding = 'utf-8'
            feed = feedparser.parse(response.content)
            
            papers = []
            for entry in feed.entries:
                # Extract paper information
                paper: Dict[str, Any] = {
                    'arxiv_id': entry.id.split('/abs/')[-1],
                    'title': entry.title.strip(),
                    'authors': [author.name for author in entry.authors[:3]],
                    'published': entry.published[:10],
                    'updated': entry.updated[:10],
                    'summary': entry.summary.replace('\n', ' ').strip(),
                    'summary_short': entry.summary.replace('\n', ' ').strip()[:250] + '...',
                    'categories': entry.get('arxiv_primary_category', {}).get('term', 'cs.LG'),
                    'url': entry.id,
                    'pdf_url': entry.id.replace('/abs/', '/pdf/') + '.pdf'
                }
                
                # Extract main keywords
                paper['keywords'] = AdvancedArxivCollector._extract_keywords(
                    str(paper['title']) + ' ' + str(paper['summary'])
                )
                
                papers.append(paper)
            
            logger.info(f"✅ '{query}' - {len(papers)} papers searched")
            return papers
        
        except requests.Timeout:
            logger.error(f"❌ arXiv API timeout")
            return []
        except Exception as e:
            logger.error(f"❌ arXiv search error: {e}")
            return []
    
    @staticmethod
    def _extract_keywords(text: str, count: int = 5) -> List[str]:
        """Extract main keywords from text"""
        # Simple keyword extraction (in reality, NLP library is used)
        keywords = []
        
        # Find specific patterns
        patterns = [
            r'\b(diffusion|RL|reinforcement learning|language model|gradient|policy)\b',
            r'\b([A-Z][A-Za-z0-9]+(?:\s+[A-Z][A-Za-z0-9]+)*)\b'  # Proper nouns
        ]
        
        for pattern in patterns:
            matches = re.findall(pattern, str(text), re.IGNORECASE)
            keywords.extend(matches[:count])  # type: ignore
        
        return list(set(keywords))[:count]  # type: ignore
    
    @classmethod
    def get_all_papers(cls) -> Dict[str, List[Dict]]:
        """Search papers for all topics (filtered by ARXIV_TOPICS env var if set)"""
        all_papers = {}

        env_topics = os.environ.get('ARXIV_TOPICS', '')
        if env_topics:
            requested = [t.strip() for t in env_topics.split(',') if t.strip()]
            unknown = [t for t in requested if t not in cls.QUERIES]
            if unknown:
                logger.warning(f"Unknown ARXIV_TOPICS ignored: {unknown}. Valid: {list(cls.QUERIES)}")
            active_queries = {t: cls.QUERIES[t] for t in requested if t in cls.QUERIES}
        else:
            active_queries = cls.QUERIES

        for topic, query in active_queries.items():
            papers = cls.search_papers(query, max_results=3)
            all_papers[topic] = papers

        return all_papers

# ==================== AI Market Analysis (Advanced) ====================

class MarketReasoningAgent:
    """LLM-based Market Trend & Strength/Weakness Analyzer"""
    
    @staticmethod
    def generate_reasoning(market_data: Dict) -> str:
        today_date = datetime.now().strftime('%Y-%m-%d')
        yesterday_date = (datetime.now() - timedelta(days=1)).strftime('%Y-%m-%d')
        
        watchlist_hits = market_data.get('classification', {}).get('watchlist_hits', [])
        watchlist_note = (
            f"\n- *Watchlist stocks detected*: {', '.join(watchlist_hits)} — include a focused comment on each of these."
            if watchlist_hits else ""
        )

        prompt = (
            f"Here is the KOSPI/KOSDAQ index data and the most-searched/highest-volume stocks from the Korean market for the most recent trading day (yesterday, {yesterday_date}):\n{market_data}\n\n"
            f"Today is {today_date}. Provide a *micro-level daily analysis* of yesterday's market ({yesterday_date}). Focus strictly on what happened that specific day:\n\n"
            f"1. *Per-stock catalyst*: For each trending or high-volume stock listed above, identify the specific news event, announcement, or intraday trigger (e.g. earnings surprise, product launch, analyst upgrade/downgrade, regulatory decision, short squeeze, insider buying) that likely drove its appearance that day. Be concrete — name the event, not just the theme.\n\n"
            f"2. *Index movement*: Explain the KOSPI/KOSDAQ change using specific same-day catalysts — e.g. a BOK statement, foreign institutional flows, options expiry, a specific earnings release, or a sector-rotation signal. Avoid generic macro narratives.\n\n"
            f"3. *Notable intraday patterns*: Highlight any unusual volume spikes, late-session reversals, or cross-sector correlations visible in yesterday's data.\n\n"
            f"STRICT RULES:\n"
            f"- Minimize references to long-term macro trends (wars, semiconductor supercycles, AI boom). Mention them at most once and only as brief background context; do not dwell on them or use them as the primary explanation.\n"
            f"- Do NOT give broad sector-level summaries. Every claim must be tied to a specific stock or a specific same-day event.\n"
            f"- Keep the total response under 400 words.{watchlist_note}\n"
            f"CRITICAL: Use Slack mrkdwn formatting (*bold*, _italic_). Do NOT use markdown headers (###, ##)."
        )
        
        # 1. Anthropic Claude
        anthropic_key = os.environ.get('ANTHROPIC_API_KEY')
        if anthropic_key:
            try:
                headers = {"x-api-key": anthropic_key, "anthropic-version": "2023-06-01", "content-type": "application/json"}
                payload = {
                    "model": "claude-3-5-haiku-latest",
                    "max_tokens": 1024,
                    "messages": [{"role": "user", "content": prompt}]
                }
                res = requests.post("https://api.anthropic.com/v1/messages", json=payload, headers=headers, timeout=30)
                if res.status_code == 200:
                    return res.json()['content'][0]['text']
                else:
                    logger.warning(f"Claude API failed with {res.status_code}: {res.text}")
            except Exception as e:
                logger.warning(f"Claude API request failed: {e}")
                
        # 2. Google Gemini
        gemini_key = os.environ.get('GEMINI_API_KEY')
        if gemini_key:
            models_to_try = [
                "gemma-3-27b-it",
                "gemini-2.5-flash"
            ]
            for model_name in models_to_try:
                try:
                    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={gemini_key}"
                    payload = {"contents": [{"parts": [{"text": prompt}]}]}
                    res = requests.post(url, json=payload, timeout=30)
                    
                    if res.status_code == 200:
                        return res.json()['candidates'][0]['content']['parts'][0]['text']
                    elif res.status_code in [404, 503, 429]:
                        logger.warning(f"Gemini {model_name} unavailable ({res.status_code}), trying next model...")
                        continue
                    else:
                        logger.warning(f"Gemini API failed with {res.status_code}: {res.text}")
                        break
                except Exception as e:
                    logger.warning(f"Gemini API request failed for {model_name}: {e}")
                    continue
                
        # 3. OpenAI
        openai_key = os.environ.get('OPENAI_API_KEY')
        if openai_key:
            try:
                headers = {"Authorization": f"Bearer {openai_key}", "Content-Type": "application/json"}
                payload = {
                    "model": "gpt-4o-mini",
                    "messages": [{"role": "user", "content": prompt}]
                }
                res = requests.post("https://api.openai.com/v1/chat/completions", json=payload, headers=headers, timeout=30)
                if res.status_code == 200:
                    return res.json()['choices'][0]['message']['content']
                else:
                    logger.warning(f"OpenAI API failed with {res.status_code}: {res.text}")
            except Exception as e:
                logger.warning(f"OpenAI API request failed: {e}")
                
        return ""

# ==================== Slack Message Formatting (Advanced) ====================

class AdvancedSlackFormatter:
    """Enhanced Slack message formatting"""
    
    @staticmethod
    def create_market_blocks(market_data: Dict) -> List[Dict]:
        """Create Slack blocks for market data"""
        blocks: List[Dict[str, Any]] = [
            {
                "type": "header",
                "text": {
                    "type": "plain_text",
                    "text": f"📊 {datetime.now().strftime('%B %d, %Y')} - Market Trends",
                    "emoji": True
                }
            },
            {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": (
                        f"🇰🇷 *KOSPI* | {market_data.get('kospi', {}).get('index', 'N/A')}\n"
                        f"💻 *KOSDAQ* | {market_data.get('kosdaq', {}).get('index', 'N/A')}"
                    )
                }
            },
            {"type": "divider"}
        ]
        
        # Blocks per sector
        for sector, data in market_data.get('sectors', {}).items():
            blocks.append({
                "type": "section",
                "fields": [
                    {
                        "type": "mrkdwn",
                        "text": f"*{sector}*\n{data.get('description', 'N/A')}"
                    },
                    {
                        "type": "mrkdwn",
                        "text": f"🚀 Key Stocks\n{', '.join(data.get('top_items', [])[:3]) or 'N/A'}"
                    }
                ]
            })
        
        return blocks
    
    @staticmethod
    def create_paper_blocks(papers_dict: Dict[str, List[Dict]]) -> List[Dict]:
        """Create Slack blocks for paper information"""
        blocks: List[Dict[str, Any]] = [
            {
                "type": "divider"
            },
            {
                "type": "header",
                "text": {
                    "type": "plain_text",
                    "text": "📚 Latest arXiv Papers",
                    "emoji": True
                }
            }
        ]
        
        for topic, papers in papers_dict.items():
            blocks.append({
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": f"*{topic}*"
                }
            })
            
            for i, paper in enumerate(papers, 1):
                paper_text = (
                    f"{i}. *{paper['title'][:70]}...*\n"
                    f"👤 {', '.join(paper['authors'][:2])}\n"
                    f"📅 {paper['published']} | "
                    f"🏷️ {', '.join(paper['keywords'][:2])}\n"
                    f"<{paper['url']}|arXiv> • "
                    f"<{paper['pdf_url']}|PDF>"
                )
                
                blocks.append({
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": paper_text
                    }
                })
        
        return blocks
    
    @staticmethod
    def create_full_payload(market_data: Dict, papers_dict: Dict, ai_reasoning: str = "") -> str:
        """Final Slack Payload"""
        blocks: List[Dict[str, Any]] = []
        
        # Header
        blocks.append({
            "type": "header",
            "text": {
                "type": "plain_text",
                "text": f"🌅 {datetime.now().strftime('%H:%M')} - Morning Market & Research Briefing",
                "emoji": True
            }
        })
        
        # Market data blocks
        blocks.extend(AdvancedSlackFormatter.create_market_blocks(market_data))
        
        # AI reasoning blocks
        if ai_reasoning:
            blocks.append({"type": "divider"})
            blocks.append({
                "type": "header",
                "text": {
                    "type": "plain_text",
                    "text": "🧠 AI Market Analysis & Reasoning",
                    "emoji": True
                }
            })
            # Slack mrkdwn text length limit is 3000 characters
            max_len = 2900
            for i in range(0, len(ai_reasoning), max_len):
                blocks.append({
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": ai_reasoning[i:i+max_len]
                    }
                })
            
        # Paper blocks
        blocks.extend(AdvancedSlackFormatter.create_paper_blocks(papers_dict))
        
        # Footer
        blocks.append({
            "type": "context",
            "elements": [
                {
                    "type": "mrkdwn",
                    "text": f"🤖 Auto-collected | 📍 KST (UTC+9) | 🔄 Updates daily at 08:00"
                }
            ]
        })
        
        payload = {
            "blocks": blocks,
            "text": "Daily Market & Research Report"
        }
        
        return json.dumps(payload, ensure_ascii=False, indent=2)

# ==================== Main Execution ====================

def main():
    logger.info("🚀 Advanced Market & Paper Collection Started")

    # 1. Collect market data
    logger.info("📊 Collecting market data...")
    market_data = KoreanMarketDataAdvanced.get_real_market_data()

    # 2. Collect arXiv papers
    logger.info("📚 Collecting arXiv papers...")
    papers_dict = AdvancedArxivCollector.get_all_papers()

    # 2.5 AI Reasoning (Execute only on Tue~Sat)
    # weekday(): Mon=0, Tue=1, Wed=2, Thu=3, Fri=4, Sat=5, Sun=6
    ai_reasoning = ""
    if datetime.now().weekday() in (1, 2, 3, 4, 5):
        logger.info("🧠 Generating AI Market Reasoning...")
        ai_reasoning = MarketReasoningAgent.generate_reasoning(market_data)
        if not ai_reasoning:
            key_missing = not any(os.environ.get(k) for k in ['ANTHROPIC_API_KEY', 'GEMINI_API_KEY', 'OPENAI_API_KEY'])
            if key_missing:
                logger.warning("Skipping AI Reasoning — no API key available (ANTHROPIC_API_KEY / GEMINI_API_KEY / OPENAI_API_KEY)")
            else:
                logger.warning("Skipping AI Reasoning — API request failed despite keys being present. Checking logs.")

    # 3. Create Slack message
    logger.info("✍️ Generating Slack message...")
    payload = AdvancedSlackFormatter.create_full_payload(market_data, papers_dict, ai_reasoning)

    payload_json = json.loads(payload)
    logger.info(f"📤 {len(payload_json['blocks'])} blocks generated")

    # 4. Save JSON (for verification)
    with open('slack_payload_example.json', 'w', encoding='utf-8') as f:
        f.write(payload)
    logger.info("📄 Payload saved: slack_payload_example.json")

    # 5. Send Slack message
    webhook_url = os.environ.get('SLACK_WEBHOOK_URL')
    if webhook_url:
        logger.info("🚀 Sending message to Slack channel...")
        try:
            res = requests.post(
                webhook_url,
                data=payload.encode('utf-8'),
                headers={'Content-Type': 'application/json'}
            )
            if res.status_code == 200:
                logger.info("✅ Slack message sent successfully!")
            else:
                logger.error(f"Slack message sending failed: {res.status_code} {res.text}")
        except Exception as e:
            logger.error(f"Error occurred while sending to Slack: {e}")
    else:
        logger.warning("SLACK_WEBHOOK_URL is not set — skipping message dispatch")

if __name__ == "__main__":
    main()
