#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import os
import re
import requests
import logging
from datetime import datetime, timedelta
from typing import Dict, List

logger = logging.getLogger(__name__)


class MarketReasoningAgent:

    @staticmethod
    def _to_mrkdwn(text: str) -> str:
        """Convert Markdown syntax to Slack mrkdwn."""
        text = re.sub(r'^#{1,6}\s+(.+)$', r'*\1*', text, flags=re.MULTILINE)
        text = re.sub(r'\*\*(.+?)\*\*', r'*\1*', text)
        text = re.sub(r'__(.+?)__', r'*\1*', text)
        text = re.sub(r'~~(.+?)~~', r'~\1~', text)
        return text

    @staticmethod
    def generate_reasoning(market_data: Dict, history: List[Dict] = []) -> str:
        today_date = datetime.now().strftime('%Y-%m-%d')
        yesterday_date = (datetime.now() - timedelta(days=1)).strftime('%Y-%m-%d')

        history_block = ""
        if history:
            lines = [
                f"- {h['date']}: KOSPI {h['kospi_index']} ({h['kospi_change']}), "
                f"KOSDAQ {h['kosdaq_index']} ({h['kosdaq_change']}) | "
                f"Trending: {', '.join(h.get('top_searched', [])[:3])}"
                for h in history[-3:]
            ]
            history_block = (
                "\n\n*3-Day History (for trend context only — do not dwell on it):*\n"
                + "\n".join(lines)
            )

        watchlist_hits = market_data.get('classification', {}).get('watchlist_hits', [])
        watchlist_note = (
            f"\n- *Watchlist stocks detected*: {', '.join(watchlist_hits)} — include a focused comment on each."
            if watchlist_hits else ""
        )

        prompt = (
            f"Here is the KOSPI/KOSDAQ index data and the most-searched/highest-volume stocks "
            f"from the Korean market for the most recent trading day (yesterday, {yesterday_date}):\n"
            f"{market_data}{history_block}\n\n"
            f"Today is {today_date}. Provide a *micro-level daily analysis* of yesterday's market "
            f"({yesterday_date}). Focus strictly on what happened that specific day:\n\n"
            f"1. *Per-stock catalyst*: For each trending or high-volume stock, identify the specific "
            f"news event, announcement, or intraday trigger (e.g. earnings surprise, analyst upgrade, "
            f"regulatory decision, short squeeze) that likely drove its appearance that day.\n\n"
            f"2. *Index movement*: Explain the KOSPI/KOSDAQ change using specific same-day catalysts "
            f"(BOK statement, foreign institutional flows, options expiry, earnings release, sector rotation).\n\n"
            f"3. *Notable patterns*: Highlight unusual volume spikes, late-session reversals, or "
            f"cross-sector correlations visible in yesterday's data.\n\n"
            f"STRICT RULES:\n"
            f"- Minimize references to long-term macro trends. Mention them at most once as brief background.\n"
            f"- Every claim must be tied to a specific stock or same-day event.\n"
            f"- Keep total response under 400 words.{watchlist_note}\n"
            f"CRITICAL: Use Slack mrkdwn (*bold*, _italic_). Do NOT use markdown headers (###, ##)."
        )

        # 1. Anthropic Claude
        anthropic_key = os.environ.get('ANTHROPIC_API_KEY')
        if anthropic_key:
            try:
                headers = {
                    "x-api-key": anthropic_key,
                    "anthropic-version": "2023-06-01",
                    "content-type": "application/json"
                }
                payload = {
                    "model": "claude-3-5-haiku-latest",
                    "max_tokens": 1024,
                    "messages": [{"role": "user", "content": prompt}]
                }
                res = requests.post(
                    "https://api.anthropic.com/v1/messages",
                    json=payload, headers=headers, timeout=30
                )
                if res.status_code == 200:
                    return MarketReasoningAgent._to_mrkdwn(res.json()['content'][0]['text'])
                logger.warning(f"Claude API failed: {res.status_code}: {res.text}")
            except Exception as e:
                logger.warning(f"Claude API error: {e}")

        # 2. Google Gemini
        gemini_key = os.environ.get('GEMINI_API_KEY')
        if gemini_key:
            for model_name in ["gemma-3-27b-it", "gemini-2.5-flash"]:
                try:
                    url = (
                        f"https://generativelanguage.googleapis.com/v1beta/models/"
                        f"{model_name}:generateContent?key={gemini_key}"
                    )
                    res = requests.post(
                        url,
                        json={"contents": [{"parts": [{"text": prompt}]}]},
                        timeout=30
                    )
                    if res.status_code == 200:
                        return MarketReasoningAgent._to_mrkdwn(
                            res.json()['candidates'][0]['content']['parts'][0]['text']
                        )
                    elif res.status_code in [404, 503, 429]:
                        logger.warning(f"Gemini {model_name} unavailable ({res.status_code}), trying next...")
                        continue
                    else:
                        logger.warning(f"Gemini API failed: {res.status_code}: {res.text}")
                        break
                except Exception as e:
                    logger.warning(f"Gemini {model_name} error: {e}")
                    continue

        # 3. OpenAI
        openai_key = os.environ.get('OPENAI_API_KEY')
        if openai_key:
            try:
                headers = {
                    "Authorization": f"Bearer {openai_key}",
                    "Content-Type": "application/json"
                }
                payload = {
                    "model": "gpt-4o-mini",
                    "messages": [{"role": "user", "content": prompt}]
                }
                res = requests.post(
                    "https://api.openai.com/v1/chat/completions",
                    json=payload, headers=headers, timeout=30
                )
                if res.status_code == 200:
                    return MarketReasoningAgent._to_mrkdwn(
                        res.json()['choices'][0]['message']['content']
                    )
                logger.warning(f"OpenAI API failed: {res.status_code}: {res.text}")
            except Exception as e:
                logger.warning(f"OpenAI API error: {e}")

        return ""
