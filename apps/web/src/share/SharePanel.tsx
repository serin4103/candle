// share/SharePanel — 저장·공유 흐름 UI(View). 로직은 useShareSession에 위임하고
// 여기서는 모드별 표현만 한다. 비로그인 전제.
import { useState } from 'react';
import { Panel, Button, palette, radius, fontStack } from '../ui';
import { editUrl, viewUrl } from './route';
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
            열람 전용 링크입니다. 복제하면 내 디자인으로 수정할 수 있어요.
          </p>
          <Button variant="primary" disabled={busy} onClick={() => void session.clone()}>
            {status === 'saving' ? '복제 중…' : '복제해서 수정'}
          </Button>
        </>
      ) : (
        <>
          <Button
            variant="primary"
            disabled={busy}
            onClick={() => void (mode === 'edit' ? session.update() : session.save())}
          >
            {status === 'saving'
              ? '저장 중…'
              : mode === 'edit'
                ? '수정 저장'
                : '저장하고 링크 만들기'}
          </Button>
          {shareLink && (
            <>
              <LinkRow label="편집 링크 (작성자용)" url={editUrl(shareLink.editToken)} />
              <LinkRow label="열람 링크 (공유용)" url={viewUrl(shareLink.viewToken)} />
            </>
          )}
        </>
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
