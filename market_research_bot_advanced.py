#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Advanced Market Data Collection with Real APIs
실제 한국 주식 데이터 + arXiv 논문 통합
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

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ==================== 한국 주식 데이터 수집 (고급) ====================

class KoreanMarketDataAdvanced:
    """한국 주식 시장 데이터 고급 수집"""
    
    # 섹터별 대표 종목 (분류용)
    SECTOR_STOCKS: Dict[str, List[str]] = {
        '반도체': [
            'Samsung Electronics', 'SK Hynix', 'Naver',
            'LG Display', 'Micron', 'ASML'
        ],
        'AI': [
            'Naver', 'Kakao', 'LG Electronics',
            'CJ CGV', 'Kakao Bank', 'Samsung Electronics'
        ],
        '금융': [
            'Woori Bank', 'Shinhan Financial', 'KB Financial',
            'Hana Financial', 'NH Investment'
        ],
        '로보틱스': [
            'Hyundai Robotics', 'Doosan Robotics',
            'ABB', 'KUKA', 'Yaskawa'
        ]
    }
    
    @staticmethod
    def get_naver_stock_data(stock_name: str) -> Dict:
        """
        Naver 금융에서 개별 종목 데이터 크롤링
        
        주의: 실제 구현 시 robots.txt 및 이용약관 확인 필요
        """
        try:
            # 예시 - 실제 구현은 Selenium이나 API 필요
            url = f"https://finance.naver.com/item/main.naver?code={stock_name}"
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
            
            # response = requests.get(url, headers=headers, timeout=5)
            # soup = BeautifulSoup(response.text, 'html.parser')
            # 파싱 로직...
            
            return {
                'name': stock_name,
                'price': 'N/A',
                'change': 'N/A',
                'volume': 'N/A'
            }
        except Exception as e:
            logger.warning(f"Naver 크롤링 실패 ({stock_name}): {e}")
            return {}
    
    @staticmethod
    def get_limit_up_stocks() -> Dict[str, List[str]]:
        """
        상한가/하한가 종목 조회
        
        데이터 소스:
        1. KRX (한국거래소) API
        2. Naver 금융 실시간 시세
        3. 유료 API (TradingView, Bloomberg 등)
        """
        try:
            # KRX API 예시
            url = "http://data.krx.co.kr/comm/bldAttendant/executePublish.cmd"
            params = {
                'pageIndex': 1,
                'method': 'searchTbTotisuStatus',
                'bld': 'dbms/comm/c_out_isu_sts'
            }
            
            # response = requests.post(url, data=params, timeout=10)
            # json_data = response.json()
            
            # 임시 데이터
            return {
                '상한가': ['Samsung Electronics', 'SK Hynix', 'Naver'],
                '하한가': ['LG Display']
            }
        except Exception as e:
            logger.warning(f"상한가 데이터 조회 실패: {e}")
            return {'상한가': [], '하한가': []}
    
    @staticmethod
    def get_sector_analysis() -> Dict:
        """
        섹터별 상세 분석
        """
        analysis = {}
        
        for sector, stocks in KoreanMarketDataAdvanced.SECTOR_STOCKS.items():
            # 각 종목 데이터 수집
            sector_data: Dict[str, Any] = {
                'stocks': [],
                'avg_change': 0,
                'top_gainer': None,
                'top_loser': None,
                'sentiment': 'NEUTRAL'
            }
            
            for stock in stocks[:5]:  # type: ignore # 최상위 5개만
                stock_data = KoreanMarketDataAdvanced.get_naver_stock_data(stock)
                if stock_data:
                    sector_data['stocks'].append(stock_data)
            
            analysis[sector] = sector_data
        
        return analysis

    @staticmethod
    def get_real_market_data() -> Dict[str, Any]:
        """
        실제 Naver 금융에서 시장 데이터를 크롤링합니다.
        """
        market_data: Dict[str, Any] = {
            'kospi': {'index': 'N/A', 'change': 'N/A'},
            'kosdaq': {'index': 'N/A', 'change': 'N/A'},
            'sectors': {}
        }
        
        try:
            url = "https://finance.naver.com/"
            res = requests.get(url, timeout=5)
            # 한글 인코딩 처리
            res.encoding = 'euc-kr' 
            soup = BeautifulSoup(res.text, "html.parser")
            
            # KOSPI & KOSDAQ
            kospi_val = soup.select_one(".kospi_area .num")
            kospi_change = soup.select_one(".kospi_area .num2")
            if kospi_val and kospi_change:
                market_data['kospi'] = {'index': kospi_val.text, 'change': kospi_change.text.strip()}
                
            kosdaq_val = soup.select_one(".kosdaq_area .num")
            kosdaq_change = soup.select_one(".kosdaq_area .num2")
            if kosdaq_val and kosdaq_change:
                market_data['kosdaq'] = {'index': kosdaq_val.text, 'change': kosdaq_change.text.strip()}
                
            # 인기 검색 종목
            pop_list = soup.select("#container > div.aside > div > div.aside_area.aside_popular > table > tbody > tr > th > a")
            top_stocks = [a.text for a in pop_list[:5]]
            
            # 거래량 상위 종목
            quant_list = soup.select("#_topItems1 tr th a")
            quant_stocks = [a.text for a in quant_list[:5]]
            
            market_data['sectors'] = {
                '🔥 인기 검색 종목': {
                    'high_limit': top_stocks,
                    'low_limit': [],
                    'description': '네이버 금융 실시간 인기 검색 상위'
                },
                '📈 거래량 집중 종목': {
                    'high_limit': quant_stocks,
                    'low_limit': [],
                    'description': '금일 거래량 상위권 종목'
                }
            }
            
        except Exception as e:
            logger.warning(f"시장 데이터 크롤링 실패: {e}")
            
        return market_data

# ==================== arXiv 논문 수집 (고급) ====================

class AdvancedArxivCollector:
    """arXiv 논문 수집 및 필터링"""
    
    BASE_URL = "http://export.arxiv.org/api/query?"
    
    # 정제된 검색 쿼리
    QUERIES = {
        'Diffusion for RL': 'cat:cs.LG AND (title:"Diffusion" OR abs:"diffusion process") AND (title:"Reinforcement Learning" OR title:"RL" OR abs:"policy gradient")',
        
        'RL for Diffusion': 'cat:cs.LG AND (title:"Reinforcement Learning" OR title:"RL" OR abs:"reward model") AND (title:"Diffusion" OR abs:"diffusion model")',
        
        'Diffusion Language Models': 'cat:cs.CL AND (title:"Diffusion" OR abs:"diffusion-based") AND (title:"Language Model" OR title:"LLM" OR abs:"generation")'
    }
    
    @staticmethod
    def search_papers(query: str, max_results: int = 5) -> List[Dict]:
        """arXiv 검색 및 결과 정렬"""
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
                # 논문 정보 추출
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
                
                # 핵심 키워드 추출
                paper['keywords'] = AdvancedArxivCollector._extract_keywords(
                    str(paper['title']) + ' ' + str(paper['summary'])
                )
                
                papers.append(paper)
            
            logger.info(f"✅ '{query}' - {len(papers)}개 논문 검색")
            return papers
        
        except requests.Timeout:
            logger.error(f"❌ arXiv API 타임아웃")
            return []
        except Exception as e:
            logger.error(f"❌ arXiv 검색 오류: {e}")
            return []
    
    @staticmethod
    def _extract_keywords(text: str, count: int = 5) -> List[str]:
        """텍스트에서 주요 키워드 추출"""
        # 간단한 키워드 추출 (실제로는 NLP 라이브러리 사용)
        keywords = []
        
        # 특정 패턴 찾기
        patterns = [
            r'\b(diffusion|RL|reinforcement learning|language model|gradient|policy)\b',
            r'\b([A-Z][A-Za-z0-9]+(?:\s+[A-Z][A-Za-z0-9]+)*)\b'  # 고유명사
        ]
        
        for pattern in patterns:
            matches = re.findall(pattern, str(text), re.IGNORECASE)
            keywords.extend(matches[:count])  # type: ignore
        
        return list(set(keywords))[:count]  # type: ignore
    
    @classmethod
    def get_all_papers(cls) -> Dict[str, List[Dict]]:
        """모든 주제에 대해 논문 검색"""
        all_papers = {}
        
        for topic, query in cls.QUERIES.items():
            papers = cls.search_papers(query, max_results=3)
            all_papers[topic] = papers
        
        return all_papers

# ==================== Slack 메시지 포맷팅 (고급) ====================

class AdvancedSlackFormatter:
    """향상된 Slack 메시지 포맷팅"""
    
    @staticmethod
    def create_market_blocks(market_data: Dict) -> List[Dict]:
        """시장 데이터 Slack 블록 생성"""
        blocks: List[Dict[str, Any]] = [
            {
                "type": "header",
                "text": {
                    "type": "plain_text",
                    "text": f"📊 {datetime.now().strftime('%Y년 %m월 %d일')} - 시장 동향",
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
        
        # 섹터별 블록
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
                        "text": f"📈 상한가\n{', '.join(data.get('high_limit', [])[:2]) or 'N/A'}"
                    }
                ]
            })
        
        return blocks
    
    @staticmethod
    def create_paper_blocks(papers_dict: Dict[str, List[Dict]]) -> List[Dict]:
        """논문 정보 Slack 블록 생성"""
        blocks: List[Dict[str, Any]] = [
            {
                "type": "divider"
            },
            {
                "type": "header",
                "text": {
                    "type": "plain_text",
                    "text": "📚 arXiv 최신 논문",
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
    def create_full_payload(market_data: Dict, papers_dict: Dict) -> str:
        """최종 Slack Payload"""
        blocks: List[Dict[str, Any]] = []
        
        # 헤더
        blocks.append({
            "type": "header",
            "text": {
                "type": "plain_text",
                "text": f"🌅 {datetime.now().strftime('%H:%M')} - 아침 시장 & 연구 브리핑",
                "emoji": True
            }
        })
        
        # 시장 데이터 블록
        blocks.extend(AdvancedSlackFormatter.create_market_blocks(market_data))
        
        # 논문 블록
        blocks.extend(AdvancedSlackFormatter.create_paper_blocks(papers_dict))
        
        # 푸터
        blocks.append({
            "type": "context",
            "elements": [
                {
                    "type": "mrkdwn",
                    "text": f"🤖 자동 수집 | 📍 한국(KST, UTC+9) | 🔄 매일 08:00 갱신"
                }
            ]
        })
        
        payload = {
            "blocks": blocks,
            "text": "Daily Market & Research Report"
        }
        
        return json.dumps(payload, ensure_ascii=False, indent=2)

# ==================== 메인 실행 ====================

def main():
    """테스트 실행"""
    
    print("=" * 60)
    print("🚀 고급 시장 & 논문 수집 시작")
    print("=" * 60)
    
    # 1. 시장 데이터 수집
    print("\n📊 시장 데이터 수집 중...")
    market_collector = KoreanMarketDataAdvanced()
    market_data = KoreanMarketDataAdvanced.get_real_market_data()
    
    # 2. arXiv 논문 수집
    print("📚 arXiv 논문 수집 중...")
    paper_collector = AdvancedArxivCollector()
    papers_dict = paper_collector.get_all_papers()
    
    # 3. Slack 메시지 생성
    print("✍️ Slack 메시지 생성 중...")
    formatter = AdvancedSlackFormatter()
    payload = formatter.create_full_payload(market_data, papers_dict)
    
    # 4. 결과 출력
    print("\n" + "=" * 60)
    print("📤 Slack 메시지 미리보기:")
    print("=" * 60)
    
    payload_json = json.loads(payload)
    print(f"\n총 {len(payload_json['blocks'])}개 블록 생성됨\n")
    
    for block in payload_json['blocks'][:3]:
        print(f"[{block.get('type')}]")
        if 'text' in block:
            print(f"  {block['text'].get('text', '')[:80]}...")
        print()
    
    print("=" * 60)
    print("✅ 준비 완료! SLACK_WEBHOOK_URL 설정 후 발송 가능합니다.")
    print("=" * 60)
    
    # 5. JSON 저장 (검증용)
    with open('slack_payload_example.json', 'w', encoding='utf-8') as f:
        f.write(payload)
    print("\n📄 Payload 저장됨: slack_payload_example.json")

if __name__ == "__main__":
    main()
