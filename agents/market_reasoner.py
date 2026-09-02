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
    def generate_reasoning(
        market_data: Dict,
        history: List[Dict] = [],
        global_context: Dict = None,
        macro_data: Dict = None
    ) -> str:
        today_date = datetime.now().strftime('%Y-%m-%d')
        yesterday_date = (datetime.now() - timedelta(days=1)).strftime('%Y-%m-%d')

        global_block = ""
        if global_context and any(v is not None for v in global_context.values()):
            lines = [
                f"- {v['label']}: {v['value']} ({v['change']})"
                for v in global_context.values() if v is not None
            ]
            global_block = (
                "\n\n*참고: 간밤 글로벌 시장 / 환율 (Overnight Global Markets & FX):*\n"
                + "\n".join(lines)
            )

        macro_block = ""
        if macro_data:
            indicators = macro_data.get('indicators', {})
            news_items = macro_data.get('news', [])
            ind_lines = [
                f"- {v['label']}: {v['value']} ({v.get('change', '')})"
                for v in indicators.values() if v is not None
            ]
            news_lines = [
                f"- [{n.get('category', '뉴스')}] {n.get('title', '')} ({n.get('source', '')})"
                for n in news_items[:6]
            ]
            macro_block = (
                "\n\n*🏛️ 거시경제 4대 지표 및 당일 주요 뉴스 (Base Rates, Bond Yields, FX, Stocks & News):*\n"
                + "*주요 지표:* \n" + "\n".join(ind_lines)
                + "\n\n*당일 거시경제 주요 뉴스:* \n" + "\n".join(news_lines)
            )

        history_block = ""
        if history:
            lines = [
                f"- {h['date']}: KOSPI {h['kospi_index']} ({h['kospi_change']}), "
                f"KOSDAQ {h['kosdaq_index']} ({h['kosdaq_change']}) | "
                f"Trending: {', '.join(h.get('top_searched', [])[:3])}"
                for h in history[-3:]
            ]
            history_block = (
                "\n\n*3-Day History:*\n"
                + "\n".join(lines)
            )

        watchlist_hits = market_data.get('classification', {}).get('watchlist_hits', [])
        watchlist_note = (
            f"\n- *Watchlist stocks detected*: {', '.join(watchlist_hits)} — include a focused comment on each."
            if watchlist_hits else ""
        )

        us_watchlist = [s.strip() for s in os.environ.get('WATCHLIST_US', '').split(',') if s.strip()]
        us_note = (
            f"\n- *US holdings to monitor*: {', '.join(us_watchlist)} — add a brief paragraph on any relevant overnight moves."
            if us_watchlist else ""
        )

        prompt = (
            f"Here is the market data, macro 4 indicators (기준금리, 채권금리, 환율, 주가), and latest macro news:\n"
            f"{market_data}{history_block}{global_block}{macro_block}\n\n"
            f"Today is {today_date}. Provide a concise analysis (in Korean) explaining today's/yesterday's ({yesterday_date}) market dynamics:\n\n"
            f"1. *거시경제 톱니바퀴 연동 분석 (Macro Gear Interaction)*: Explain how **기준금리 (Interest Rates) ➡️ 채권금리 (Bond Yields) ➡️ 환율 (FX USD/KRW) ➡️ 주가 (Equities)** "
            f"interacted based on today's indicators and macro news. Highlight any investor sentiment on bond bargain hunting (채권 저가 매수 심리: 고금리 확정 이자 + 향후 금리 인하 시 시세차익) or risk-off sentiment.\n\n"
            f"2. *주요 종목 촉매 (Per-stock Catalysts)*: Identify intraday triggers for trending/high-volume stocks.\n\n"
            f"3. *지수 및 수급 동향 (Index & Market Movement)*: Briefly summarize KOSPI/KOSDAQ and FX impacts.\n\n"
            f"STRICT RULES:\n"
            f"- Write clearly in Korean.\n"
            f"- Keep total response under 500 words.{watchlist_note}{us_note}\n"
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
            for model_name in ["gemma-3-27b-it", "gemini-3.5-flash", "gemini-2.5-flash"]:
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
