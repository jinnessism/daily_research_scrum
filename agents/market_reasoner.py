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
            f"Here is the daily market data, macro 4 indicators (기준금리, 채권금리, 환율, 주가), and latest macro news:\n"
            f"{market_data}{history_block}{global_block}{macro_block}\n\n"
            f"Today is {today_date}. Generate a structured Korean macroeconomic & market briefing report for today/yesterday ({yesterday_date}).\n\n"
            f"REQUIRED FORMAT (Follow this exact structure in Slack mrkdwn using bold section headers with quoted catchphrases, bullet points •, and a blockquote > summary):\n\n"
            f"*1. 기준금리 및 연준(Fed)/한은 동향:* **\"<핵심 요약 헤드라인>\"**\n"
            f"• <금리 결정, 중앙은행 스탠스, 9월 FOMC/금통위 경계감 등 지표 및 뉴스 내용 상세 분석>\n\n"
            f"*2. 채권 시장:* **\"<핵심 요약 헤드라인>\"**\n"
            f"• <장/단기 채권 금리 상방/하방 압력, 수급 부담, 투자자의 채권 저가 매수 심리(고금리 이자 확정 + 시세 차익 기대) 및 분할 매수 동향 상세 분석>\n\n"
            f"*3. 환율 (원/달러):* **\"<핵심 요약 헤드라인>\"**\n"
            f"• <원/달러 환율 및 달러 인덱스 등락 배경, 환율 밴드 범위, 수출업체 수급 및 외환시장 반응 상세 분석>\n\n"
            f"*4. 주식 시장:* **\"<핵심 요약 헤드라인>\"**\n"
            f"• <KOSPI/KOSDAQ 및 주요 인기/거래량 상위 종목 촉매, 섹터 순환매, 증시 자금 이동 동향 분석>\n\n"
            f"---\n"
            f"*💡 한 줄 요약*\n"
            f"> \"<금리 ➡️ 채권 ➡️ 환율 ➡️ 주가 톱니바퀴 연동 핵심 관전 포인트를 명확한 한 문장으로 요약>\"{watchlist_note}{us_note}\n\n"
            f"STRICT RULES:\n"
            f"- Write entirely in natural, professional Korean.\n"
            f"- Do NOT use markdown headers like ### or ## (Slack does not support them). Use *bold* text.\n"
            f"- Use bullet points (•) for detailed items under each section.\n"
            f"- Keep total response under 550 words."
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
