# 복사하기에서 클립보드 쓰기 실패가 처리되지 않음

- 증상: `components/converter.tsx`의 `copy()`가 `navigator.clipboard.writeText`의 reject를 잡지 않아, 권한 거부나 비보안 컨텍스트에서 피드백이 전혀 없습니다.
- 근거: 코드 리뷰(low) 지적. 일반 localhost/https 사용에서는 재현되지 않아 스펙 수용 기준은 깨지지 않습니다.
- 추정 원인: 오류 경로를 두지 않았습니다.
- 시도: 없음 (범위 밖으로 기록).
- 다음 단계: catch에서 "복사하지 못했습니다" 피드백을 보여 줍니다.
