import React from 'react';
import { beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { AppEntityStructureHub } from './AppEntityStructureHub.jsx';

describe('AppEntityStructureHub default visibility', () => {
  beforeEach(() => localStorage.clear());

  it('starts collapsed and only shows child/tree panels after the user opens the hub', () => {
    const selectedEntity = { id: 'e1', name: 'Lầu Các Hội Đường', members: [] };
    render(
      <AppEntityStructureHub
        selectedEntity={selectedEntity}
        scopeKey="a:b:e1"
        treeFeatureOn
        membersPanelProps={{}}
        treePanelProps={{ entities: [selectedEntity] }}
      />
    );

    expect(screen.queryByPlaceholderText(/Lọc thẻ con/i)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /Hiện khu/i }));
    expect(screen.getByPlaceholderText(/Lọc thẻ con/i)).toBeTruthy();
  });
});
