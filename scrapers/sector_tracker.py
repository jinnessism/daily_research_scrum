#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Sector & Theme Tracker
Scrapes real-time trending sectors and themes from Naver Finance / Stock
"""

import logging
from typing import Dict, List, Any

import requests
from bs4 import BeautifulSoup

logger = logging.getLogger(__name__)


class SectorTracker:

    @classmethod
    def get_trending_themes(cls, max_items: int = 5) -> List[Dict[str, Any]]:
        """Fetch top trending market themes/sectors by daily percentage change."""
        url = "https://finance.naver.com/sise/theme.naver"
        try:
            res = requests.get(url, timeout=5)
            res.encoding = 'euc-kr'
            soup = BeautifulSoup(res.text, 'html.parser')

            themes: List[Dict[str, Any]] = []
            for tr in soup.select('table.type_1 tr'):
                name_td = tr.select_one('td.col_type1 a')
                rate_td = tr.select_one('td.col_type2')
                lead_td = tr.select_one('td.col_type4 a')

                if name_td and rate_td:
                    name = name_td.text.strip()
                    change_rate = rate_td.text.strip()
                    leader = lead_td.text.strip() if lead_td else 'N/A'
                    href = name_td.get('href', '')
                    
                    # Convert to Naver Stock link format if available
                    stock_link = f"https://finance.naver.com{href}" if href else "https://stock.naver.com/"

                    themes.append({
                        'name': name,
                        'change_rate': change_rate,
                        'leader': leader,
                        'link': stock_link
                    })

            logger.info(f"Fetched {len(themes)} trending themes from Naver")
            return themes[:max_items]

        except Exception as e:
            logger.warning(f"Failed to scrape Naver theme rankings: {e}")
            return []


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    print(SectorTracker.get_trending_themes())
