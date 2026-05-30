// share/SharePanel — 공유 흐름 UI(View). 로직은 useShareSession에 위임하고 여기서는
// 모드별 표현만 한다. 저장·수정 버튼은 App 셸 상단바가 맡고(PRD-S6), 이 모달은
// 상단바 "공유" 버튼이 열며 열람 링크 노출과 열람자의 복제 흐름을 담당한다.
import { useState } from 'react';
import { Button, palette, radius, shadow, fontStack } from '../ui';
import { viewUrl } from './route';
import type { ShareSession } from './useShareSession';

/** 복사 가능한 링크 한 줄. */
function LinkRow({ label, url }: { label: string; url: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    void navigator.clipboard?.writeText(url).then(
      () => {
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1200);
      },
      () => undefined,
    );
  };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span style={{ fontSize: 12, fontWeight: 700, color: palette.textMuted }}>{label}</span>
      <div style={{ display: 'flex', gap: 6 }}>
        <input
          readOnly
          value={url}
          onFocus={(e) => e.currentTarget.select()}
          style={{
            flex: 1,
            minWidth: 0,
            fontFamily: fontStack,
            fontSize: 12,
            color: palette.text,
            background: palette.surfaceMuted,
            border: `1px solid ${palette.border}`,
            borderRadius: radius.sm,
            padding: '6px 8px',
          }}
        />
        <Button onClick={copy} aria-label={`${label} 복사`}>
          {copied ? '복사됨' : '복사'}
        </Button>
      </div>
    </div>
  );
}

/** 공유 모달 본문 — 모드별 표현(열람 링크 / 복제 / 저장 안내). */
function ShareContent({ session }: { session: ShareSession }) {
  const { mode, status, error, shareLink } = session;
  const busy = status === 'saving' || status === 'loading';

  return (
    <>
      {mode === 'view' ? (
        <>
          <p style={{ margin: 0, fontSize: 13, color: palette.textMuted }}>
            열람 전용 링크입니다. 복제하면 새 탭에서 디자인을 편집할 수 있어요(로그인 없이 가능, 저장은 로그인 시).
          </p>
          <Button variant="primary" disabled={busy} onClick={() => session.clone()}>
            복제해서 수정
          </Button>
        </>
      ) : shareLink ? (
        <>
          <p style={{ margin: 0, fontSize: 13, color: palette.textMuted }}>
            이 열람 링크로 누구나(로그인 없이) 시안을 볼 수 있어요.
          </p>
          <LinkRow label="열람 링크 (공유용)" url={viewUrl(shareLink.viewToken)} />
        </>
      ) : (
        <p style={{ margin: 0, fontSize: 13, color: palette.textMuted }}>
          상단 <strong>저장</strong> 버튼으로 디자인을 저장하면 공유용 열람 링크가 생겨요.
        </p>
      )}
      {status === 'loading' && (
        <p style={{ margin: 0, fontSize: 13, color: palette.textMuted }}>불러오는 중…</p>
      )}
      {error && <p style={{ margin: 0, fontSize: 13, color: palette.primaryDeep }}>오류: {error}</p>}
    </>
  );
}

/** 상단바 "공유" 버튼이 여는 작은 모달(상단 우측). 바깥 클릭으로 닫힌다. */
export function ShareModal({ session, onClose }: { session: ShareSession; onClose: () => void }) {
  return (
    <div role="presentation" onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 100 }}>
      <div
        role="dialog"
        aria-label="공유"
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'absolute',
          top: 56,
          right: 20,
          fontFamily: fontStack,
          width: 320,
          background: palette.surface,
          border: `1px solid ${palette.border}`,
          borderRadius: radius.md,
          boxShadow: shadow.card,
          padding: 16,
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <strong style={{ fontSize: 14 }}>공유</strong>
          <Button onClick={onClose} aria-label="공유 닫기">
            닫기
          </Button>
        </div>
        <ShareContent session={session} />
      </div>
    </div>
  );
}
