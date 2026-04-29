#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import os
import json
import requests
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Any

from bs4 import BeautifulSoup

try:
    import FinanceDataReader as fdr
    _HAS_FDR = True
except ImportError:
    _HAS_FDR = False

logger = logging.getLogger(__name__)

_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
_CONFIG_PATH = os.path.join(_ROOT, 'stocks_config.json')


class KoreanMarketDataAdvanced:

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
        market_data: Dict[str, Any] = {
            'kospi': {'index': 'N/A', 'change': 'N/A'},
            'kosdaq': {'index': 'N/A', 'change': 'N/A'},
            'sectors': {},
            'classification': {}
        }

        # 1. Index data: FinanceDataReader (primary) — always reflects previous trading day's close
        if _HAS_FDR:
            _fill_index_from_fdr(market_data)
        else:
            logger.warning("FinanceDataReader not available — index data will be N/A")

        # 2. Trending stocks: Naver Finance scraping (independent of index data)
        try:
            res = requests.get("https://finance.naver.com/", timeout=5)
            res.encoding = 'euc-kr'
            soup = BeautifulSoup(res.text, "html.parser")

            pop_list = soup.select(
                "#container > div.aside > div > div.aside_area.aside_popular > table > tbody > tr > th > a"
            )
            top_stocks = [a.text for a in pop_list[:5]]

            quant_list = soup.select("#_topItems1 tr th a")
            quant_stocks = [a.text for a in quant_list[:5]]

            all_trending = list(dict.fromkeys(top_stocks + quant_stocks))
            market_data['classification'] = cls._classify_trending_stocks(all_trending)

            market_data['sectors'] = {
                '\U0001f525 Top Searched Stocks': {
                    'top_items': top_stocks,
                    'description': 'Real-time trending search queries on Naver Finance'
                },
                '\U0001f4c8 Top Volume Stocks': {
                    'top_items': quant_stocks,
                    'description': 'Top stocks by trading volume today'
                }
            }

        except Exception as e:
            logger.warning(f"Naver trending scraping failed: {e}")

        return market_data


def _fill_index_from_fdr(market_data: Dict[str, Any]) -> None:
    """Fetch previous trading day's KOSPI/KOSDAQ close + change from FinanceDataReader."""
    try:
        start = (datetime.now() - timedelta(days=10)).strftime('%Y-%m-%d')
        today = datetime.now().strftime('%Y-%m-%d')
        for ticker, key in [('KS11', 'kospi'), ('KQ11', 'kosdaq')]:
            df = fdr.DataReader(ticker, start, today)
            if len(df) < 2:
                continue
            last = df.iloc[-1]
            prev = df.iloc[-2]
            change_pct = (float(last['Close']) - float(prev['Close'])) / float(prev['Close']) * 100
            sign = '+' if change_pct >= 0 else ''
            market_data[key] = {
                'index': f"{last['Close']:,.2f}",
                'change': f"{sign}{change_pct:.2f}%"
            }
        logger.info("Index data loaded from FinanceDataReader")
    except Exception as e:
        logger.error(f"FinanceDataReader index fetch failed: {e}")
