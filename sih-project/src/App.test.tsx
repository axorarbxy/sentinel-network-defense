import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from './App';
import { useSentinelStore } from './store/useSentinelStore';

vi.mock('./components/NetworkTwin', () => ({ NetworkTwin: () => null }));
vi.mock('./components/KillChainRail', () => ({ KillChainRail: () => null }));
vi.mock('./components/TimelineScrubber', () => ({ TimelineScrubber: () => null }));
vi.mock('./components/ThreatTickerFeed', () => ({ ThreatTickerFeed: () => null }));
vi.mock('./components/RadialRiskGauge', () => ({ RadialRiskGauge: () => null }));
vi.mock('./components/ConnectionStatusPill', () => ({ ConnectionStatusPill: () => null }));
vi.mock('./components/ModeSwitch', () => ({ ModeSwitch: () => null }));
vi.mock('./components/EdgeDetailPopover', () => ({ EdgeDetailPopover: () => null }));
vi.mock('./components/ShapExplainabilityStrip', () => ({ ShapExplainabilityStrip: () => null }));

afterEach(() => {
  cleanup();
  window.history.replaceState({}, '', '/');
});

beforeEach(() => {
  useSentinelStore.setState({
    isAuthenticated: true,
    authToken: 'test-token',
    isMockMode: false,
    selectedNodeId: null,
    selectedEdgeId: null,
  });
});

describe('investigation route', () => {
  it('preselects the host from the URL', async () => {
    window.history.replaceState({}, '', '/investigate/10.0.0.10');

    render(<App />);

    expect(await screen.findByRole('heading', { name: '10.0.0.10' })).toBeTruthy();
    expect(useSentinelStore.getState().selectedNodeId).toBe('10.0.0.10');
  });

  it('clears the selected host and returns home when closed from a deep link', async () => {
    window.history.replaceState({}, '', '/investigate/10.0.0.10');
    const user = userEvent.setup();

    render(<App />);

    await user.click(await screen.findByRole('button', { name: 'Close host details' }));

    await waitFor(() => expect(window.location.pathname).toBe('/'));
    expect(useSentinelStore.getState().selectedNodeId).toBeNull();
    expect(screen.queryByRole('button', { name: 'Close host details' })).toBeNull();
  });

  it('clears a selected host without navigating when closed from the command deck', async () => {
    window.history.replaceState({}, '', '/?from=command-deck');
    useSentinelStore.getState().setSelectedNodeId('10.0.0.5');
    const user = userEvent.setup();

    render(<App />);

    await user.click(await screen.findByRole('button', { name: 'Close host details' }));

    await waitFor(() => expect(useSentinelStore.getState().selectedNodeId).toBeNull());
    expect(window.location.pathname).toBe('/');
    expect(window.location.search).toBe('?from=command-deck');
  });
});
