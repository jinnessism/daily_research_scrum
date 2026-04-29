#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import os
import json
import re
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


class AdvancedArxivCollector:

    try:
        with open(_QUERIES_PATH, 'r', encoding='utf-8') as _f:
            QUERIES: Dict[str, str] = json.load(_f).get('queries', {})
    except FileNotFoundError:
        logger.warning("arxiv_queries.json not found — query list will be empty")
        QUERIES = {}
    except Exception as _e:
        logger.error(f"Failed to load arxiv_queries.json: {_e}")
        QUERIES = {}

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

    @classmethod
    def search_papers(cls, query: str, max_new: int = 3) -> List[Dict]:
        sent = cls._load_sent_cache()
        try:
            params = {
                'search_query': query,
                'start': 0,
                'max_results': max_new * 4,  # Fetch extra to cover cache hits
                'sortBy': 'submittedDate',
                'sortOrder': 'descending'
            }
            response = requests.get(_BASE_URL, params=params, timeout=15)
            response.encoding = 'utf-8'
            feed = feedparser.parse(response.content)

            new_papers = []
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
                    'keywords': _extract_keywords(entry.title + ' ' + entry.summary)
                }
                new_papers.append(paper)
                if len(new_papers) >= max_new:
                    break

            logger.info(f"✅ '{query[:60]}...' — {len(new_papers)} new papers")
            return new_papers

        except requests.Timeout:
            logger.error("arXiv API timeout")
            return []
        except Exception as e:
            logger.error(f"arXiv search error: {e}")
            return []

    @classmethod
    def get_all_papers(cls) -> Dict[str, List[Dict]]:
        env_topics = os.environ.get('ARXIV_TOPICS', '')
        if env_topics:
            requested = [t.strip() for t in env_topics.split(',') if t.strip()]
            unknown = [t for t in requested if t not in cls.QUERIES]
            if unknown:
                logger.warning(f"Unknown ARXIV_TOPICS ignored: {unknown}. Valid: {list(cls.QUERIES)}")
            active_queries = {t: cls.QUERIES[t] for t in requested if t in cls.QUERIES}
        else:
            active_queries = cls.QUERIES

        all_papers = {}
        for topic, query in active_queries.items():
            all_papers[topic] = cls.search_papers(query, max_new=3)
        return all_papers


def _extract_keywords(text: str, count: int = 5) -> List[str]:
    keywords: List[str] = []
    patterns = [
        r'\b(diffusion|flow matching|RL|reinforcement learning|language model|RAG|retrieval|image retrieval)\b',
        r'\b([A-Z][A-Za-z0-9]+(?:\s+[A-Z][A-Za-z0-9]+)*)\b'
    ]
    for pattern in patterns:
        matches = re.findall(pattern, str(text), re.IGNORECASE)
        keywords.extend(matches[:count])
    return list(set(keywords))[:count]
