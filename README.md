# Daily Research Scrum Bot

매일 아침 8시(KST)에 한국 주식 시장 동향과 arXiv 최신 논문을 Slack으로 발송하는 자동화 봇입니다.

## 기능

- **시장 분석**: KOSPI/KOSDAQ 지수 및 인기/거래량 상위 종목 크롤링 (Naver Finance)
- **AI 분석**: 당일 종목별 구체적인 촉매 분석 (Claude / Gemini / OpenAI 순으로 fallback)
- **논문 수집**: arXiv에서 설정된 토픽의 최신 논문 수집
- **Slack 발송**: GitHub Actions를 통해 매일 자동 실행

## 설정 파일

### `arxiv_queries.json`
arXiv 검색 토픽과 쿼리를 정의합니다. Python 코드 수정 없이 토픽을 추가/삭제할 수 있습니다.

```json
{
  "queries": {
    "토픽 이름": "arXiv 검색 쿼리"
  }
}
```

### `stocks_config.json`
섹터별 종목 목록과 개인 워치리스트를 정의합니다. 트렌딩 종목이 워치리스트에 포함되면 AI 분석에서 우선적으로 다룹니다.

```json
{
  "sectors": {
    "섹터명": {
      "korean": ["종목A", "종목B"],
      "global": ["Stock A", "Stock B"]
    }
  },
  "watchlist": ["관심종목1", "관심종목2"]
}
```

## 환경 변수

| 변수 | 필수 | 설명 |
|------|------|------|
| `SLACK_WEBHOOK_URL` | ✅ | Slack Incoming Webhook URL |
| `ANTHROPIC_API_KEY` | 택1 | Claude API 키 |
| `GEMINI_API_KEY` | 택1 | Google Gemini API 키 |
| `OPENAI_API_KEY` | 택1 | OpenAI API 키 |

AI 분석은 위 순서대로 사용 가능한 키를 시도합니다. 키가 없으면 AI 분석 섹션은 생략됩니다.

## 로컬 실행

```bash
pip install -r requirements.txt
SLACK_WEBHOOK_URL=... ANTHROPIC_API_KEY=... python market_research_bot_advanced.py
```

## GitHub Actions

`.github/workflows/daily-report.yml`에 정의되어 있으며, 매일 UTC 23:00 (KST 08:00)에 실행됩니다. Repository Secrets에 위 환경 변수를 등록하면 됩니다.
