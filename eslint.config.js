import js from '@eslint/js';
import tseslint from 'typescript-eslint';

/**
 * MVVM 레이어 경계 강제 (CLAUDE.md "MVVM 규율").
 * ViewModel(tools, store 액션, texture)과 Model(schema, geometry)은
 * 렌더 기술(three / r3f / react-dom)을 import 하지 않는다.
 */
const renderTechRestriction = {
  files: [
    'apps/web/src/editor2d/tools/**/*.{ts,tsx}',
    'apps/web/src/document/store/**/*.{ts,tsx}',
    'apps/web/src/viewer3d/texture/**/*.{ts,tsx}',
    'packages/shared/**/*.{ts,tsx}',
  ],
  rules: {
    'no-restricted-imports': [
      'error',
      {
        paths: [
          { name: 'three', message: 'ViewModel/Model 레이어는 렌더 기술(three)을 import할 수 없습니다.' },
          { name: '@react-three/fiber', message: 'ViewModel/Model 레이어는 R3F를 import할 수 없습니다.' },
          { name: '@react-three/drei', message: 'ViewModel/Model 레이어는 R3F를 import할 수 없습니다.' },
        ],
        patterns: [{ group: ['three/*'], message: 'ViewModel/Model 레이어는 three를 import할 수 없습니다.' }],
      },
    ],
  },
};

export default tseslint.config(
  { ignores: ['**/dist/**', '**/build/**', '**/node_modules/**', '**/*.config.{js,ts}'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  renderTechRestriction,
);
