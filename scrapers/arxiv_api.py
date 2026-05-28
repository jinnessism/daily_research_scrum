#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import os
import json
import re
import time
import requests
import logging
from datetime import datetime
from typing import Dict, List, Any

import feedparser

logger = logging.getLogger(__name__)

_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
_QUERIES_PATH = os.path.join(_ROOT, 'arxiv_queries.json')
_SENT_CACHE_PATH = os.path.join(_ROOT, 'db', 'sent_papers.json')

_BASE_URL = "http://export.arxiv.org/api/query?"
_USER_AGENT = "daily-research-scrum/1.0 (+https://github.com/; mailto:pjmin831@kaist.ac.kr)"
_REQUEST_TIMEOUT = 30
_INTER_REQUEST_SLEEP = 5.0  # arXiv asks ≥3s between hits; 5s for safety margin
_MAX_RETRIES = 2
_BACKOFF_429 = [30, 90, 300]  # seconds to wait per attempt when arXiv returns 429
_BACKOFF_TIMEOUT = [5, 10, 15]  # seconds to wait per attempt on network timeout

_WEEKDAY_NAMES = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']


class AdvancedArxivCollector:

    try:
        with open(_QUERIES_PATH, 'r', encoding='utf-8') as _f:
            _CFG = json.load(_f)
            QUERIES: Dict[str, str] = _CFG.get('queries', {})
            SCHEDULE: Dict[str, List[str]] = _CFG.get('schedule', {})
    except FileNotFoundError:
        logger.warning("arxiv_queries.json not found — query list will be empty")
        QUERIES = {}
        SCHEDULE = {}
    except Exception as _e:
        logger.error(f"Failed to load arxiv_queries.json: {_e}")
        QUERIES = {}
        SCHEDULE = {}

    @staticmethod
    def _load_sent_cache() -> Dict[str, str]:
        try:
            with open(_SENT_CACHE_PATH, 'r', encoding='utf-8') as f:
                return json.load(f)
        except (FileNotFoundError, json.JSONDecodeError):
            return {}

    @staticmethod
    def mark_papers_sent(papers: List[Dict]) -> None:
        cache = AdvancedArxivCollector._load_sent_cache()
        today = datetime.now().strftime('%Y-%m-%d')
        for paper in papers:
            cache[paper['arxiv_id']] = today
        os.makedirs(os.path.dirname(_SENT_CACHE_PATH), exist_ok=True)
        with open(_SENT_CACHE_PATH, 'w', encoding='utf-8') as f:
            json.dump(cache, f, ensure_ascii=False, indent=2)

    @staticmethod
    def _fetch(query: str, max_results: int) -> tuple:
        """GET arXiv with retry/backoff on 429 + timeout. Returns (content, hit_429)."""
        params = {
            'search_query': query,
            'start': 0,
            'max_results': max_results,
            'sortBy': 'submittedDate',
            'sortOrder': 'descending',
        }
        headers = {'User-Agent': _USER_AGENT}

        for attempt in range(_MAX_RETRIES + 1):
            try:
                resp = requests.get(_BASE_URL, params=params, headers=headers, timeout=_REQUEST_TIMEOUT)
                if resp.status_code == 429:
                    retry_after = int(resp.headers.get('Retry-After', 0))
                    wait = retry_after or _BACKOFF_429[min(attempt, len(_BACKOFF_429) - 1)]
                    logger.warning(f"arXiv 429 (rate limited) — sleeping {wait}s (attempt {attempt + 1}/{_MAX_RETRIES + 1})")
                    time.sleep(wait)
                    continue
                resp.raise_for_status()
                resp.encoding = 'utf-8'
                return resp.content, False
            except requests.Timeout:
                wait = _BACKOFF_TIMEOUT[min(attempt, len(_BACKOFF_TIMEOUT) - 1)]
                logger.warning(f"arXiv timeout — retrying in {wait}s (attempt {attempt + 1}/{_MAX_RETRIES + 1})")
                time.sleep(wait)
            except requests.RequestException as e:
                logger.error(f"arXiv request error: {e}")
                return b'', False
        logger.error(f"arXiv giving up after {_MAX_RETRIES + 1} attempts: {query[:60]}...")
        return b'', True  # treat exhausted retries as 429 penalty signal

    @classmethod
    def search_papers(cls, query: str, max_new: int = 3) -> tuple:
        """Returns (papers, hit_429). hit_429 signals caller to abort remaining topics."""
        sent = cls._load_sent_cache()
        content, hit_429 = cls._fetch(query, max_results=max_new * 4)
        if not content:
            logger.info(f"✅ '{query[:60]}...' — 0 new papers (no response)")
            return [], hit_429

        feed = feedparser.parse(content)
        new_papers: List[Dict] = []
        for entry in feed.entries:
            arxiv_id = entry.id.split('/abs/')[-1]
            if arxiv_id in sent:
                continue
            paper: Dict[str, Any] = {
                'arxiv_id': arxiv_id,
                'title': entry.title.strip(),
                'authors': [author.name for author in entry.authors[:3]],
                'published': entry.published[:10],
                'updated': entry.updated[:10],
                'summary': entry.summary.replace('\n', ' ').strip(),
                'summary_short': entry.summary.replace('\n', ' ').strip()[:250] + '...',
                'categories': entry.get('arxiv_primary_category', {}).get('term', 'cs.LG'),
                'url': entry.id,
                'pdf_url': entry.id.replace('/abs/', '/pdf/') + '.pdf',
                'keywords': _extract_keywords(entry.title + ' ' + entry.summary),
            }
            new_papers.append(paper)
            if len(new_papers) >= max_new:
                break

        logger.info(f"✅ '{query[:60]}...' — {len(new_papers)} new papers")
        return new_papers, False

    @classmethod
    def _topics_for_today(cls) -> List[str]:
        """Pick today's topics from schedule (KST weekday). Empty list = no topics scheduled."""
        if not cls.SCHEDULE:
            return list(cls.QUERIES.keys())
        today_name = _WEEKDAY_NAMES[datetime.now().weekday()]
        topics = cls.SCHEDULE.get(today_name, [])
        unknown = [t for t in topics if t not in cls.QUERIES]
        if unknown:
            logger.warning(f"Scheduled topics not found in queries: {unknown}")
        return [t for t in topics if t in cls.QUERIES]

    @classmethod
    def get_all_papers(cls) -> Dict[str, List[Dict]]:
        env_topics = os.environ.get('ARXIV_TOPICS', '')
        if env_topics:
            requested = [t.strip() for t in env_topics.split(',') if t.strip()]
            unknown = [t for t in requested if t not in cls.QUERIES]
            if unknown:
                logger.warning(f"Unknown ARXIV_TOPICS ignored: {unknown}. Valid: {list(cls.QUERIES)}")
            active_topics = [t for t in requested if t in cls.QUERIES]
        else:
            active_topics = cls._topics_for_today()

        if not active_topics:
            logger.info(f"📭 No topics scheduled for {_WEEKDAY_NAMES[datetime.now().weekday()]}")
            return {}

        logger.info(f"📚 Today's topics ({len(active_topics)}): {active_topics}")
        all_papers: Dict[str, List[Dict]] = {}
        for i, topic in enumerate(active_topics):
            if i > 0:
                time.sleep(_INTER_REQUEST_SLEEP)
            papers, hit_429 = cls.search_papers(cls.QUERIES[topic], max_new=3)
            all_papers[topic] = papers
            if hit_429:
                remaining = active_topics[i + 1:]
                if remaining:
                    logger.warning(f"🛑 Skipping {len(remaining)} remaining topics due to arXiv penalty: {remaining}")
                    for t in remaining:
                        all_papers[t] = []
                break
        return all_papers


def _extract_keywords(text: str, count: int = 5) -> List[str]:
    keywords: List[str] = []
    patterns = [
        r'\b(diffusion|flow matching|RL|reinforcement learning|language model|RAG|retrieval|query rewriting|query refinement|soft query)\b',
        r'\b([A-Z][A-Za-z0-9]+(?:\s+[A-Z][A-Za-z0-9]+)*)\b'
    ]
    for pattern in patterns:
        matches = re.findall(pattern, str(text), re.IGNORECASE)
        keywords.extend(matches[:count])
    return list(set(keywords))[:count]
