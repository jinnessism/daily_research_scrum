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
        ai_reasoning: str = ""
    ) -> str:
        blocks: List[Dict[str, Any]] = [
            {
                "type": "header",
                "text": {
                    "type": "plain_text",
                    "text": f"🌅 {datetime.now().strftime('%H:%M')} - Morning Market & Research Briefing",
                    "emoji": True
                }
            }
        ]

        blocks.extend(AdvancedSlackFormatter.create_market_blocks(market_data))

        if ai_reasoning:
            blocks.append({"type": "divider"})
            blocks.append({
                "type": "header",
                "text": {
                    "type": "plain_text",
                    "text": "🧠 AI Market Analysis",
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
