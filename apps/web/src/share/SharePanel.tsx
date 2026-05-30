// share/SharePanel — 공유 흐름 UI(View). 로직은 useShareSession에 위임하고 여기서는
// 모드별 표현만 한다. 저장·수정 버튼은 App 셸 상단바가 맡고(PRD-S6), 이 패널은
// 열람 링크 노출과 열람자의 복제 흐름을 담당한다.
import { useState } from 'react';
import { Panel, Button, palette, radius, fontStack } from '../ui';
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

export function SharePanel({ session }: { session: ShareSession }) {
  const { mode, status, error, shareLink } = session;
  const busy = status === 'saving' || status === 'loading';

  return (
    <Panel title="공유">
      {mode === 'view' ? (
        <>
          <p style={{ margin: 0, fontSize: 13, color: palette.textMuted }}>
            열람 전용 링크입니다. 복제하면 내 디자인으로 수정할 수 있어요(로그인 필요).
          </p>
          <Button variant="primary" disabled={busy} onClick={() => void session.clone()}>
            {status === 'saving' ? '복제 중…' : '복제해서 수정'}
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
      {error && (
        <p style={{ margin: 0, fontSize: 13, color: palette.primaryDeep }}>오류: {error}</p>
      )}
    </Panel>
  );
}
