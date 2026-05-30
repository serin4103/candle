// mypage/MyPage — 내 저장 디자인 목록 화면(View, PRD-S6). 로그인 사용자의 디자인을
// 받아 카드로 보여주고, 선택 시 편집 페이지(`/d/:id`)로 이동한다. 목록 조회는 api,
// 인증은 auth 세션에 위임 — 소유권 판단은 백엔드가 한다.
import { useEffect, useState } from 'react';
import type { Design } from '@candle/shared';
import { listMyDesigns } from '../api';
import { readCachedDesigns } from './prefetch';
import { designUrl, navigate } from '../share';
import type { AuthSession } from '../auth';
import { palette, radius, shadow, fontStack, Button } from '../ui';

const SHAPE_LABEL: Record<Design['shape'], string> = {
  circle: '원형',
  square: '사각형',
  heart: '하트',
};

/** 저장 디자인 한 장 — 크림색 미리보기 + 모양·요소 수. 클릭 시 편집으로 이동. */
function DesignCard({ design }: { design: Design }) {
  return (
    <button
      onClick={() => navigate(designUrl(design.id))}
      style={{
        fontFamily: fontStack,
        textAlign: 'left',
        cursor: 'pointer',
        border: `1px solid ${palette.border}`,
        borderRadius: radius.lg,
        background: palette.surface,
        boxShadow: shadow.soft,
        padding: 0,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div style={{ height: 110, background: design.creamColor }} />
      <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 4 }}>
        <strong style={{ fontSize: 14, color: palette.text }}>
          {SHAPE_LABEL[design.shape]} 케이크
        </strong>
        <span style={{ fontSize: 12, color: palette.textMuted }}>
          요소 {design.elements.length}개 · {design.spec.size}호 {design.spec.layers}단
        </span>
      </div>
    </button>
  );
}

export function MyPage({ session }: { session: AuthSession }) {
  const { user, status, isConfigured, signInWithGoogle } = session;
  // prefetch 캐시가 있으면 즉시 그린다(stale-while-revalidate). 리로드 전 버튼
  // hover/pointerdown에서 채워둔 캐시가 있어 빈 화면 없이 바로 목록이 뜬다.
  const [designs, setDesigns] = useState<Design[] | null>(() =>
    user ? readCachedDesigns(user.id) : null,
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    // 캐시를 보여주는 동안 백그라운드로 최신 목록을 받아 갱신한다.
    void (async () => {
      try {
        const list = await listMyDesigns();
        if (!cancelled) setDesigns(list);
      } catch (e) {
        // 이미 캐시로 그려둔 게 있으면 그대로 두고(끊김 방지), 없을 때만 오류 표시.
        if (!cancelled && !readCachedDesigns(user.id)) setError((e as Error).message);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  return (
    <div
      style={{
        fontFamily: fontStack,
        minHeight: '100vh',
        background: palette.bg,
        color: palette.text,
        padding: '24px 32px',
      }}
    >
      <header style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <strong style={{ fontSize: 20 }}>🍰 내 디자인</strong>
        <div style={{ marginLeft: 'auto' }}>
          <Button
            variant="primary"
            onClick={() => navigate(`${window.location.origin}/`)}
          >
            새 디자인 만들기
          </Button>
        </div>
      </header>

      {status === 'loading' ? (
        <p style={{ color: palette.textMuted }}>불러오는 중…</p>
      ) : !user ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'flex-start' }}>
          <p style={{ color: palette.textMuted }}>로그인하면 저장한 디자인을 볼 수 있어요.</p>
          {isConfigured && (
            <Button variant="primary" onClick={() => void signInWithGoogle()}>
              Google로 로그인
            </Button>
          )}
        </div>
      ) : error ? (
        <p style={{ color: palette.primaryDeep }}>오류: {error}</p>
      ) : !designs ? (
        <p style={{ color: palette.textMuted }}>불러오는 중…</p>
      ) : designs.length === 0 ? (
        <p style={{ color: palette.textMuted }}>아직 저장한 디자인이 없어요. 새로 만들어 보세요!</p>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
            gap: 16,
          }}
        >
          {designs.map((d) => (
            <DesignCard key={d.id} design={d} />
          ))}
        </div>
      )}
    </div>
  );
}
