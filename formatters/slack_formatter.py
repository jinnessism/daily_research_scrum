#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import json
import logging
from datetime import datetime
from typing import Dict, List, Any

logger = logging.getLogger(__name__)


class AdvancedSlackFormatter:

    @staticmethod
    def create_market_blocks(market_data: Dict) -> List[Dict]:
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
                        f"🇰🇷 *KOSPI* | {market_data.get('kospi', {}).get('index', 'N/A')} "
                        f"{market_data.get('kospi', {}).get('change', '')}\n"
                        f"💻 *KOSDAQ* | {market_data.get('kosdaq', {}).get('index', 'N/A')} "
                        f"{market_data.get('kosdaq', {}).get('change', '')}"
                    )
                }
            },
            {"type": "divider"}
        ]

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
    def create_global_blocks(global_context: Dict) -> List[Dict]:
        """Render overnight US/FX market context. Returns [] when nothing to show."""
        if not global_context:
            return []

        order = ['usdkrw', 'nasdaq', 'sp500', 'sox']
        emojis = {
            'usdkrw': '💱',
            'nasdaq': '💻',
            'sp500': '📈',
            'sox': '🔌',
        }

        lines = []
        for key in order:
            entry = global_context.get(key)
            if not entry:
                continue
            change = entry.get('change', '')
            # Reuse the existing +/- sign convention; add ▲/▼ arrows for clarity.
            arrow = ''
            if change.startswith('+'):
                arrow = '▲ '
            elif change.startswith('-'):
                arrow = '▼ '
            lines.append(
                f"{emojis.get(key, '•')} *{entry.get('label', key)}* | "
                f"{entry.get('value', 'N/A')} {arrow}{change}".rstrip()
            )

        if not lines:
            return []

        return [
            {"type": "divider"},
            {
                "type": "header",
                "text": {
                    "type": "plain_text",
                    "text": "🌐 Global / Overnight Markets",
                    "emoji": True
                }
            },
            {
                "type": "section",
                "text": {"type": "mrkdwn", "text": "\n".join(lines)}
            }
        ]

    @staticmethod
    def create_macro_blocks(macro_data: Dict) -> List[Dict]:
        """Render Macro 4 Key Indicators (Base rates, Bond yields, FX, Equities) and Daily News."""
        if not macro_data:
            return []

        indicators = macro_data.get('indicators', {})
        news = macro_data.get('news', [])

        blocks: List[Dict[str, Any]] = [
            {"type": "divider"},
            {
                "type": "header",
                "text": {
                    "type": "plain_text",
                    "text": "🏛️ 거시경제 4대 지표 (금리 · 채권 · 환율 · 증시)",
                    "emoji": True
                }
            }
        ]

        # 1. Indicator breakdown
        us10y = indicators.get('us10y') or {}
        us2y = indicators.get('us2y') or {}
        kr3y = indicators.get('kr3y') or {}
        usdkrw = indicators.get('usdkrw') or {}
        usdx = indicators.get('usdx') or {}
        fed_rate = indicators.get('fed_rate') or {}
        bok_rate = indicators.get('bok_rate') or {}

        ind_text = (
            f"🏦 *기준금리*: 미 연준 {fed_rate.get('value', 'N/A')} | 한국은행 {bok_rate.get('value', 'N/A')}\n"
            f"📉 *채권금리*: US 10Y `{us10y.get('value', 'N/A')}` ({us10y.get('change', '')}) | "
            f"US 2Y `{us2y.get('value', 'N/A')}` | "
            f"KR 3Y 국채 `{kr3y.get('value', 'N/A')}` ({kr3y.get('change', '')})\n"
            f"💱 *환율*: USD/KRW `{usdkrw.get('value', 'N/A')}` ({usdkrw.get('change', '')}) | "
            f"달러인덱스 `{usdx.get('value', 'N/A')}` ({usdx.get('change', '')})"
        )
        blocks.append({
            "type": "section",
            "text": {"type": "mrkdwn", "text": ind_text}
        })

        # 2. Macro News Section
        if news:
            news_lines = []
            for item in news[:6]:
                category = item.get('category', '뉴스')
                title = item.get('title', '')
                link = item.get('link', '#')
                source = item.get('source', '')
                pub = item.get('published', '')
                news_lines.append(f"• *[{category}]* <{link}|{title}> _({source} | {pub})_")

            blocks.append({
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": "*📰 거시경제 매일 트래킹 뉴스*\n" + "\n".join(news_lines)
                }
            })

        return blocks

    @staticmethod
    def create_paper_blocks(papers_dict: Dict[str, List[Dict]]) -> List[Dict]:
        blocks: List[Dict[str, Any]] = [
            {"type": "divider"},
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
                "text": {"type": "mrkdwn", "text": f"*{topic}*"}
            })

            if not papers:
                blocks.append({
                    "type": "section",
                    "text": {"type": "mrkdwn", "text": "_No new papers found_"}
                })
                continue

            for i, paper in enumerate(papers, 1):
                keywords = paper.get('keywords', [])
                paper_text = (
                    f"{i}. *{paper['title'][:70]}{'...' if len(paper['title']) > 70 else ''}*\n"
                    f"👤 {', '.join(paper['authors'][:2])}\n"
                    f"📅 {paper['published']}"
                    + (f" | 🏷️ {', '.join(keywords[:2])}" if keywords else "") + "\n"
                    f"<{paper['url']}|arXiv> • <{paper['pdf_url']}|PDF>"
                )
                blocks.append({
                    "type": "section",
                    "text": {"type": "mrkdwn", "text": paper_text}
                })

        return blocks

    @staticmethod
    def create_full_payload(
        market_data: Dict,
        papers_dict: Dict[str, List[Dict]],
        ai_reasoning: str = "",
        global_context: Dict = None,
        macro_data: Dict = None
    ) -> str:
        blocks: List[Dict[str, Any]] = [
            {
                "type": "header",
                "text": {
                    "type": "plain_text",
                    "text": f"🌅 {datetime.now().strftime('%H:%M')} - Daily Market, Macro & Research Briefing",
                    "emoji": True
                }
            }
        ]

        blocks.extend(AdvancedSlackFormatter.create_market_blocks(market_data))

        blocks.extend(AdvancedSlackFormatter.create_global_blocks(global_context))

        if macro_data:
            blocks.extend(AdvancedSlackFormatter.create_macro_blocks(macro_data))

        if ai_reasoning:
            blocks.append({"type": "divider"})
            blocks.append({
                "type": "header",
                "text": {
                    "type": "plain_text",
                    "text": "🧠 AI Macro & Market Analysis",
                    "emoji": True
                }
            })
            max_len = 2900
            for i in range(0, len(ai_reasoning), max_len):
                blocks.append({
                    "type": "section",
                    "text": {"type": "mrkdwn", "text": ai_reasoning[i:i + max_len]}
                })

        blocks.extend(AdvancedSlackFormatter.create_paper_blocks(papers_dict))

        blocks.append({
            "type": "context",
            "elements": [{
                "type": "mrkdwn",
                "text": "🤖 Auto-collected | 📍 KST (UTC+9) | 🔄 Updates daily at 08:00"
            }]
        })

        payload = {
            "blocks": blocks,
            "text": "Daily Market & Research Report"
        }
        return json.dumps(payload, ensure_ascii=False, indent=2)
