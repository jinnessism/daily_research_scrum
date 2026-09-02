#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Macro News & Indicators Collector
Tracks the 4 key macroeconomic drivers:
1. Central Bank Base Interest Rates (기준금리)
2. Bond Yields / Prices (채권금리 / 미국 10년물·한국 3년물)
3. Exchange Rates (환율 / USD-KRW, Dollar Index)
4. Equity Market Indices & Sentiment (주가 / KOSPI, KOSDAQ, S&P 500, Nasdaq)

Fetches real-time market data and daily news headlines via RSS.
"""

import os
import re
import urllib.parse
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Any

import requests
from bs4 import BeautifulSoup
import feedparser

try:
    import FinanceDataReader as fdr
    _HAS_FDR = True
except ImportError:
    _HAS_FDR = False

logger = logging.getLogger(__name__)


class MacroNewsCollector:

    @staticmethod
    def _parse_naver_exday(text: str) -> str:
        """Clean and format Naver Finance price change strings into clean arrow format."""
        if not text:
            return ""
        text = ' '.join(text.split())
        m_pct = re.search(r'\(\s*([+\-\s]*[\d\.]+)\s*%\s*\)', text)
        pct_val = m_pct.group(1).replace(' ', '') if m_pct else ''

        m_num = re.search(r'([\d\.]+)', text)
        num_val = m_num.group(1) if m_num else ''

        if '하락' in text or (pct_val and pct_val.startswith('-')):
            sign = '-'
            arrow = '▼'
            if pct_val and not pct_val.startswith('-'):
                pct_val = f"-{pct_val}"
        elif '상승' in text or (pct_val and pct_val.startswith('+')):
            sign = '+'
            arrow = '▲'
            if pct_val and not pct_val.startswith('+'):
                pct_val = f"+{pct_val}"
        else:
            sign = ''
            arrow = ''

        if num_val and pct_val:
            return f"{arrow} {sign}{num_val}%p ({pct_val}%)"
        elif num_val:
            return f"{arrow} {sign}{num_val}%p"
        return text

    @classmethod
    def get_macro_indicators(cls) -> Dict[str, Any]:
        """Fetch macroeconomic key 4 indicators: Interest rates, Bond Yields, Exchange rates."""
        indicators: Dict[str, Any] = {
            'us10y': None,
            'us2y': None,
            'kr3y': None,
            'kr10y': None,
            'fed_rate': {'label': 'US Fed Target Rate', 'value': '5.25~5.50%'},
            'bok_rate': {'label': 'BOK Base Rate', 'value': '3.50%'},
            'usdkrw': None,
            'usdx': None,
        }

        start = (datetime.now() - timedelta(days=10)).strftime('%Y-%m-%d')

        # 1. US Treasury Bond Yields via FDR (FRED)
        if _HAS_FDR:
            for ticker, key, label in [
                ('FRED:DGS10', 'us10y', 'US 10Y Treasury Yield'),
                ('FRED:DGS2', 'us2y', 'US 2Y Treasury Yield'),
                ('FRED:DEXKOUS', 'usdkrw', 'USD/KRW FX Rate'),
            ]:
                try:
                    df = fdr.DataReader(ticker, start)
                    if len(df) >= 2:
                        last_val = float(df.iloc[-1, 0])
                        prev_val = float(df.iloc[-2, 0])
                        chg = last_val - prev_val
                        sign = '+' if chg >= 0 else ''
                        arrow = '▲ ' if chg > 0 else ('▼ ' if chg < 0 else '')
                        if 'Yield' in label:
                            indicators[key] = {
                                'label': label,
                                'value': f"{last_val:.2f}%",
                                'change': f"{arrow}{sign}{chg:.2f}%p"
                            }
                        else:
                            indicators[key] = {
                                'label': label,
                                'value': f"{last_val:,.2f}",
                                'change': f"{arrow}{sign}{chg:.2f}"
                            }
                except Exception as e:
                    logger.warning(f"FDR fetch failed for {ticker}: {e}")

        # 2. KR Bond Yields & Dollar Index via Naver Finance
        naver_codes = [
            ('IRR_GOVT03Y', 'kr3y', 'KR 3Y Govt Bond Yield'),
            ('IRR_CORP03Y', 'kr10y', 'KR 3Y Corporate Bond Yield'),
            ('FX_USDX', 'usdx', 'Dollar Index (USDX)'),
        ]
        for cd, key, label in naver_codes:
            try:
                url = f"https://finance.naver.com/marketindex/interestDetail.naver?marketindexCd={cd}"
                if key == 'usdx':
                    url = f"https://finance.naver.com/marketindex/worldExchangeDetail.naver?marketindexCd={cd}"
                res = requests.get(url, timeout=5)
                res.encoding = 'euc-kr'
                soup = BeautifulSoup(res.text, 'html.parser')

                val_el = soup.select_one('p.no_today')
                exday_el = soup.select_one('p.no_exday')
                if val_el and exday_el:
                    val = val_el.text.strip().replace('\n', '').replace('%', '')
                    exday = cls._parse_naver_exday(exday_el.text)
                    unit = "%" if "Yield" in label or "Bond" in label else ""
                    indicators[key] = {
                        'label': label,
                        'value': f"{val}{unit}",
                        'change': exday
                    }
            except Exception as e:
                logger.warning(f"Naver marketindex fetch failed for {cd}: {e}")

        return indicators

    @classmethod
    def get_macro_news(cls, max_items: int = 8) -> List[Dict[str, str]]:
        """Fetch daily macro news articles related to interest rates, bond yields, FX, and stocks.

        Uses RSS feeds with keyword search queries tailored to macro economic news.
        Returns a list of dicts with keys: title, link, published, source, category.
        """
        queries = [
            ("기준금리/연준", "기준금리 OR 연준 OR 한국은행 OR 금리인하 OR 금리인상"),
            ("채권/금리", "채권금리 OR 국채금리 OR 미국채 OR 국고채 OR 채권매수"),
            ("환율/달러", "환율 OR 원달러 OR 달러강세 OR 환율상승"),
            ("증시/주가", "주가 OR 증시 OR 코스피 OR 증시전망")
        ]

        articles: List[Dict[str, str]] = []
        seen_titles = set()

        for category, q in queries:
            try:
                encoded_q = urllib.parse.quote(q)
                rss_url = f"https://news.google.com/rss/search?q={encoded_q}&hl=ko&gl=KR&ceid=KR:ko"
                feed = feedparser.parse(rss_url)

                for entry in feed.entries[:3]:
                    raw_title = entry.get('title', '').strip()
                    if not raw_title:
                        continue

                    # Extract source publisher name if present in title e.g. "Title - Publisher"
                    source_name = entry.get('source', {}).get('title', '')
                    clean_title = raw_title
                    if ' - ' in raw_title:
                        parts = raw_title.rsplit(' - ', 1)
                        clean_title = parts[0].strip()
                        if not source_name:
                            source_name = parts[1].strip()

                    # Deduplicate by normalized title
                    norm_title = re.sub(r'\s+', '', clean_title)
                    if norm_title in seen_titles:
                        continue
                    seen_titles.add(norm_title)

                    pub_date = entry.get('published', '')
                    if pub_date:
                        try:
                            # Shorten rfc822 date e.g. "Wed, 02 Sep 2026 06:46:43 GMT" -> "09-02 06:46"
                            dt = datetime.strptime(pub_date[:25], "%a, %d %b %Y %H:%M:%S")
                            pub_str = dt.strftime("%m-%d %H:%M")
                        except Exception:
                            pub_str = pub_date[:16]
                    else:
                        pub_str = datetime.now().strftime("%m-%d")

                    articles.append({
                        'category': category,
                        'title': clean_title,
                        'link': entry.get('link', ''),
                        'published': pub_str,
                        'source': source_name or '언론사'
                    })
            except Exception as e:
                logger.warning(f"Macro news RSS fetch failed for query '{category}': {e}")

        logger.info(f"Fetched {len(articles)} macro news articles")
        return articles[:max_items]

    @classmethod
    def get_all_macro_data(cls) -> Dict[str, Any]:
        """Aggregate macro indicators and daily news into a single context dict."""
        return {
            'indicators': cls.get_macro_indicators(),
            'news': cls.get_macro_news()
        }


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    data = MacroNewsCollector.get_all_macro_data()
    print("=== MACRO INDICATORS ===")
    for k, v in data['indicators'].items():
        print(f"  {k}: {v}")
    print("\n=== MACRO NEWS ===")
    for item in data['news']:
        print(f"  [{item['category']}] [{item['source']}] {item['title']} ({item['published']})")
