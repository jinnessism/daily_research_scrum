#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Finance Concept Manager
Provides daily educational financial & economic concepts from db/finance_concepts.json
"""

import os
import json
import logging
from datetime import datetime
from typing import Dict, Any

logger = logging.getLogger(__name__)

_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
_CONCEPT_DB_PATH = os.path.join(_ROOT, 'db', 'finance_concepts.json')


class FinanceConceptManager:

    @classmethod
    def get_daily_concept(cls) -> Dict[str, Any]:
        """Return a single educational financial concept for today based on the day of the year."""
        try:
            with open(_CONCEPT_DB_PATH, 'r', encoding='utf-8') as f:
                concepts = json.load(f)

            if not concepts:
                return cls._fallback_concept()

            # Rotate concept based on day of the year
            day_of_year = datetime.now().timetuple().tm_yday
            idx = day_of_year % len(concepts)
            concept = concepts[idx]
            logger.info(f"Loaded daily concept #{concept.get('id')}: {concept.get('term')}")
            return concept
        except Exception as e:
            logger.warning(f"Failed to load finance concepts: {e}")
            return cls._fallback_concept()

    @staticmethod
    def _fallback_concept() -> Dict[str, Any]:
        return {
            "id": 0,
            "category": "거시경제",
            "term": "장단기 금리 역전 (Yield Curve Inversion)",
            "summary": "장기 국채 금리가 단기 국채 금리보다 낮아지는 현상입니다.",
            "detail": "연준의 금리 인상이나 침체 우려로 단기 금리가 급등할 때 발생하며, 대표적인 경기 침체 선행 지표입니다.",
            "takeaway": "금리차 역전 후 정상화되는 시점에 시장 변동성이 높아질 수 있으므로 주시해야 합니다."
        }


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    print(FinanceConceptManager.get_daily_concept())
