#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Daily Research Scrum Bot — Entry Point
"""

import os
import json
import logging
import requests
from datetime import datetime
from typing import Dict, List

from scrapers.naver_finance import KoreanMarketDataAdvanced
from scrapers.arxiv_api import AdvancedArxivCollector
from agents.market_reasoner import MarketReasoningAgent
from formatters.slack_formatter import AdvancedSlackFormatter

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S',
    handlers=[
        logging.FileHandler('market_bot.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

_ROOT = os.path.dirname(os.path.abspath(__file__))
_HISTORY_PATH = os.path.join(_ROOT, 'db', 'market_history.json')


def load_history() -> List[Dict]:
    try:
        with open(_HISTORY_PATH, 'r', encoding='utf-8') as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return []


def save_history(history: List[Dict], market_data: Dict) -> None:
    today = datetime.now().strftime('%Y-%m-%d')
    snapshot = {
        'date': today,
        'kospi_index': market_data.get('kospi', {}).get('index', 'N/A'),
        'kospi_change': market_data.get('kospi', {}).get('change', 'N/A'),
        'kosdaq_index': market_data.get('kosdaq', {}).get('index', 'N/A'),
        'kosdaq_change': market_data.get('kosdaq', {}).get('change', 'N/A'),
        'top_searched': market_data.get('sectors', {})
                                   .get('🔥 Top Searched Stocks', {})
                                   .get('top_items', []),
        'top_volume': market_data.get('sectors', {})
                                 .get('📈 Top Volume Stocks', {})
                                 .get('top_items', []),
    }
    history = [h for h in history if h.get('date') != today]
    history.append(snapshot)
    history = sorted(history, key=lambda x: x['date'])[-7:]
    os.makedirs(os.path.dirname(_HISTORY_PATH), exist_ok=True)
    with open(_HISTORY_PATH, 'w', encoding='utf-8') as f:
        json.dump(history, f, ensure_ascii=False, indent=2)
    logger.info(f"Market history saved ({len(history)} entries)")


def main():
    logger.info("=" * 50)
    logger.info("🚀 Daily Research Scrum Bot Started")
    logger.info("=" * 50)

    # 1. Load history
    history = load_history()
    logger.info(f"📅 Loaded {len(history)} days of market history")

    # 2. Collect market data
    logger.info("📊 Collecting market data...")
    market_data = KoreanMarketDataAdvanced.get_real_market_data()
    save_history(history, market_data)

    # 3. Collect arXiv papers (duplicate-filtered)
    logger.info("📚 Collecting arXiv papers...")
    papers_dict = AdvancedArxivCollector.get_all_papers()
    total_new = sum(len(p) for p in papers_dict.values())
    logger.info(f"📄 {total_new} new papers found across {len(papers_dict)} topics")

    # 4. AI Reasoning (Tue–Sat only)
    ai_reasoning = ""
    if datetime.now().weekday() in (1, 2, 3, 4, 5):
        logger.info("🧠 Generating AI market reasoning...")
        ai_reasoning = MarketReasoningAgent.generate_reasoning(market_data, history)
        if not ai_reasoning:
            has_key = any(
                os.environ.get(k)
                for k in ['ANTHROPIC_API_KEY', 'GEMINI_API_KEY', 'OPENAI_API_KEY']
            )
            if not has_key:
                logger.warning("Skipping AI reasoning — no API key available")
            else:
                logger.warning("AI reasoning failed despite keys being present")

    # 5. Build Slack payload
    logger.info("✍️ Generating Slack payload...")
    payload = AdvancedSlackFormatter.create_full_payload(market_data, papers_dict, ai_reasoning)

    payload_json = json.loads(payload)
    logger.info(f"📤 {len(payload_json['blocks'])} blocks generated")

    with open('slack_payload_example.json', 'w', encoding='utf-8') as f:
        f.write(payload)
    logger.info("📄 Payload saved: slack_payload_example.json")

    # 6. Send to Slack
    webhook_url = os.environ.get('SLACK_WEBHOOK_URL')
    if webhook_url:
        logger.info("🚀 Sending to Slack...")
        try:
            res = requests.post(
                webhook_url,
                data=payload.encode('utf-8'),
                headers={'Content-Type': 'application/json'}
            )
            if res.status_code == 200:
                logger.info("✅ Slack message sent successfully!")
            else:
                logger.error(f"Slack send failed: {res.status_code} {res.text}")
        except Exception as e:
            logger.error(f"Slack send error: {e}")
    else:
        logger.warning("SLACK_WEBHOOK_URL not set — skipping dispatch")

    # 7. Mark papers as sent (after successful Slack send or always)
    all_sent = [p for papers in papers_dict.values() for p in papers]
    if all_sent:
        AdvancedArxivCollector.mark_papers_sent(all_sent)
        logger.info(f"📝 Marked {len(all_sent)} papers as sent")

    logger.info("=" * 50)
    logger.info("✅ Done")
    logger.info("=" * 50)


if __name__ == "__main__":
    main()
