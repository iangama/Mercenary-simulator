import { useEffect, useMemo, useState } from 'react';
import type { GlobalGameState, MapNode, TravelMode } from '../../types/game';
import { estimateRouteInterceptionRisk, estimateRouteSuppliesCost, estimateTravelDaysForState } from '../../services/strategicMapEngine';

const modeLabels: Record<TravelMode, string> = {
  foot: 'On Foot',
  horses: 'Horses',
  wagon: 'Wagon',
  river_barge: 'River Barge',
  coastal_ship: 'Coastal Ship',
  forced_march: 'Forced March',
  stealth_column: 'Stealth Column',
  guided_route: 'Guided Route'
};

const regionTint: Record<string, string> = {
  reg_blackfen: 'rgba(73, 111, 88, 0.28)',
  reg_sunscar: 'rgba(177, 143, 82, 0.24)',
  reg_emberfall: 'rgba(139, 76, 58, 0.26)',
  reg_hallowport: 'rgba(75, 106, 138, 0.28)'
};

const nodeIcons: Record<MapNode['type'], string> = {
  capital: 'Crown',
  city: 'City',
  village: 'Village',
  fortress: 'Fort',
  ruin: 'Ruin',
  port: 'Port',
  crossing: 'Crossing',
  outpost: 'Outpost'
};

export function StrategicMap(props: {
  state: GlobalGameState;
  onTravel: (routeId: string, mode: TravelMode) => void;
  onBeginSiteOperation: (landmarkId: string) => void;
  onExploreCurrentNode: () => void;
  onAdvanceDay: () => void;
  onExplainAction: (message: string, tone?: 'info' | 'success' | 'warn') => void;
}) {
  const [filter, setFilter] = useState<'war' | 'climate' | 'commerce' | 'contracts' | 'rivals'>('war');
  const [zoom, setZoom] = useState(1);
  const [focusRegionId, setFocusRegionId] = useState<string>('all');
  const [selectedNodeId, setSelectedNodeId] = useState<string>(props.state.company_node_id);

  useEffect(() => {
    if (!props.state.map_nodes.some((node) => node.id === selectedNodeId)) {
      setSelectedNodeId(props.state.company_node_id);
    }
  }, [props.state.company_node_id, props.state.map_nodes, selectedNodeId]);

  const nodeMap = useMemo(() => new Map(props.state.map_nodes.map((node) => [node.id, node])), [props.state.map_nodes]);
  const regionMap = useMemo(() => new Map(props.state.regions.map((region) => [region.id, region])), [props.state.regions]);
  const factionMap = useMemo(() => new Map(props.state.factions.map((faction) => [faction.id, faction])), [props.state.factions]);
  const rivalsByNode = useMemo(() => {
    const map = new Map<string, typeof props.state.rivals>();
    for (const rival of props.state.rivals) {
      const list = map.get(rival.node_id) ?? [];
      list.push(rival);
      map.set(rival.node_id, list);
    }
    return map;
  }, [props.state.rivals]);
  const availableContractsByNode = useMemo(() => {
    const map = new Map<string, number>();
    for (const contract of props.state.contracts) {
      if (contract.status !== 'available' || !contract.location_node_id) continue;
      map.set(contract.location_node_id, (map.get(contract.location_node_id) ?? 0) + 1);
    }
    return map;
  }, [props.state.contracts]);

  const currentNode = nodeMap.get(props.state.company_node_id) ?? null;
  const selectedNode = nodeMap.get(selectedNodeId) ?? currentNode;
  const selectedRegion = selectedNode ? regionMap.get(selectedNode.region_id) ?? null : null;
  const selectedIsCurrentNode = selectedNode?.id === currentNode?.id;
  const selectedLandmarks = selectedNode ? props.state.landmarks.filter((landmark) => landmark.node_id === selectedNode.id) : [];
  const currentNodeLandmarks = currentNode ? props.state.landmarks.filter((landmark) => landmark.node_id === currentNode.id) : [];
  const nextHiddenLandmark = currentNodeLandmarks.find((landmark) => !landmark.discovered) ?? null;
  const nextPlayableLandmark = currentNodeLandmarks.find((landmark) => landmark.discovered && !landmark.activated) ?? null;
  const activeTravel = props.state.active_travel;
  const visibleNodes = useMemo(
    () => props.state.map_nodes.filter((node) => focusRegionId === 'all' || node.region_id === focusRegionId),
    [focusRegionId, props.state.map_nodes]
  );
  const visibleNodeIds = new Set(visibleNodes.map((node) => node.id));
  const visibleRoutes = props.state.map_routes.filter(
    (route) => visibleNodeIds.has(route.from) && visibleNodeIds.has(route.to) && (!route.hidden || route.discovered)
  );
  const selectedRoutes = props.state.map_routes.filter(
    (route) => (route.from === selectedNode?.id || route.to === selectedNode?.id) && (!route.hidden || route.discovered)
  );
  const focusedRegions = props.state.regions.filter((region) => focusRegionId === 'all' || region.id === focusRegionId);
  const focusedContracts = props.state.contracts.filter(
    (contract) => contract.status === 'available' && (focusRegionId === 'all' || contract.region_id === focusRegionId)
  );
  const focusedRivals = props.state.rivals.filter((rival) => focusRegionId === 'all' || rival.region_focus === focusRegionId);
  const focusedPressure = focusedRegions.reduce((sum, region) => sum + region.threat_pressure + region.rival_presence, 0) / Math.max(1, focusedRegions.length);
  const cargoLoad =
    props.state.mercenaries.filter((merc) => merc.alive).length * 6 +
    props.state.company.supplies +
    props.state.company.ammunition * 0.4 +
    props.state.company.medicine * 0.6 +
    props.state.company.trade_goods * 4;
  const frontierLegend = useMemo(
    () => [
      `${props.state.landmarks.filter((landmark) => landmark.discovered).length} surveyed landmarks`,
      `${props.state.forward_posts.length} active field posts`,
      `${props.state.contracts.filter((contract) => contract.status === 'available' && contract.extraction_node_id).length} contracts with extraction`
    ],
    [props.state.contracts, props.state.forward_posts.length, props.state.landmarks]
  );

  const regionBodies = useMemo(
    () =>
      props.state.regions.map((region) => {
        const nodes = props.state.map_nodes.filter((node) => node.region_id === region.id);
        const minX = Math.min(...nodes.map((node) => node.x));
        const maxX = Math.max(...nodes.map((node) => node.x));
        const minY = Math.min(...nodes.map((node) => node.y));
        const maxY = Math.max(...nodes.map((node) => node.y));
        return {
          region,
          left: minX - 9,
          top: minY - 10,
          width: Math.max(18, maxX - minX + 18),
          height: Math.max(18, maxY - minY + 20)
        };
      }),
    [props.state.map_nodes, props.state.regions]
  );

  function nodeOverlay(nodeId: string) {
    const node = nodeMap.get(nodeId);
    const region = node ? regionMap.get(node.region_id) : undefined;
    if (!node || !region) return '';
    switch (filter) {
      case 'war':
        return `${region.front_state} • occ ${Math.round(node.occupation)}`;
      case 'climate':
        return `${props.state.season} ${props.state.weather}`;
      case 'commerce':
        return `market ${node.market} • logistics ${node.logistics}`;
      case 'contracts':
        return `${availableContractsByNode.get(node.id) ?? 0} contracts`;
      case 'rivals':
      default:
        return `${(rivalsByNode.get(node.id) ?? []).length} rivals`;
    }
  }

  function handleExploreAttempt() {
    if (activeTravel) {
      props.onExplainAction('The company is already traveling. Advance the campaign day or resolve the active interruption first.');
      return;
    }
    if (!nextHiddenLandmark) {
      props.onExplainAction('This node is already fully surveyed. Travel onward or work a discovered site instead.', 'info');
      return;
    }
    props.onExploreCurrentNode();
  }

  function handleSiteAttempt(landmarkId: string, landmarkName: string, landmarkActivated: boolean) {
    if (landmarkActivated) {
      props.onExplainAction(`${landmarkName} has already been worked. Look for another site or move on.`, 'info');
      return;
    }
    if (!selectedIsCurrentNode) {
      props.onExplainAction(`Travel to ${selectedNode?.name ?? 'that node'} before opening ${landmarkName}.`);
      return;
    }
    if (activeTravel) {
      props.onExplainAction('Finish the active journey before opening a site operation.');
      return;
    }
    props.onBeginSiteOperation(landmarkId);
  }

  function handleTravelAttempt(routeId: string, mode: TravelMode, route: { weather_locked?: boolean }, destinationName: string) {
    if (!selectedIsCurrentNode) {
      props.onExplainAction(`You are only previewing ${selectedNode?.name ?? 'that node'}. Return focus to the company before starting this route.`);
      return;
    }
    if (route.weather_locked) {
      props.onExplainAction(`The route to ${destinationName} is weather-locked right now.`);
      return;
    }
    if (activeTravel) {
      props.onExplainAction('A journey is already active. Click Advance Campaign Day to continue it.', 'info');
      return;
    }
    props.onTravel(routeId, mode);
  }

  return (
    <section className="panel strategic-map world-map-panel">
      <div className="map-header">
        <div>
          <h3>Frontier Atlas</h3>
          <p>
            Position: <strong>{currentNode?.name ?? 'Unknown'}</strong> in{' '}
            {currentNode ? regionMap.get(currentNode.region_id)?.name ?? 'unknown lands' : 'unknown lands'}
          </p>
          {selectedNode && currentNode && !selectedIsCurrentNode && (
            <p className="atlas-selection-note">
              Viewing <strong>{selectedNode.name}</strong>. The company is still at <strong>{currentNode.name}</strong>.
            </p>
          )}
          <p className="atlas-subtitle">
            Read the land first. Contracts, trade and conflict should feel attached to roads, ports, ridges and crossings.
          </p>
        </div>
        {activeTravel && (
          <div className="travel-status">
            <strong>Journey Underway</strong>
            <span>
              {activeTravel.progress_days}/{activeTravel.total_days} days to {nodeMap.get(activeTravel.to_node_id)?.name ?? 'destination'}
            </span>
            <span>{modeLabels[activeTravel.mode]} • supplies {activeTravel.supplies_cost}/day</span>
          </div>
        )}
      </div>

      <div className="map-toolbar">
        <div className="filter-group">
          <button className={filter === 'war' ? 'active-policy' : ''} onClick={() => setFilter('war')}>War</button>
          <button className={filter === 'climate' ? 'active-policy' : ''} onClick={() => setFilter('climate')}>Climate</button>
          <button className={filter === 'commerce' ? 'active-policy' : ''} onClick={() => setFilter('commerce')}>Commerce</button>
          <button className={filter === 'contracts' ? 'active-policy' : ''} onClick={() => setFilter('contracts')}>Contracts</button>
          <button className={filter === 'rivals' ? 'active-policy' : ''} onClick={() => setFilter('rivals')}>Rivals</button>
        </div>
        <div className="filter-group">
          <label>
            Focus
            <select value={focusRegionId} onChange={(event) => setFocusRegionId(event.target.value)}>
              <option value="all">All Regions</option>
              {props.state.regions.map((region) => (
                <option key={region.id} value={region.id}>{region.name}</option>
              ))}
            </select>
          </label>
          <button onClick={() => setZoom((value) => Math.max(0.8, Number((value - 0.15).toFixed(2))))}>-</button>
          <button onClick={() => setZoom(1)}>Reset</button>
          <button onClick={() => setZoom((value) => Math.min(1.8, Number((value + 0.15).toFixed(2))))}>+</button>
        </div>
      </div>

      <div className="map-summary-grid">
        <article className="summary-chip">
          <strong>Frontier Pressure</strong>
          <span>{Math.round(focusedPressure)}</span>
        </article>
        <article className="summary-chip">
          <strong>Open Contracts</strong>
          <span>{focusedContracts.length}</span>
        </article>
        <article className="summary-chip">
          <strong>Rivals In Scope</strong>
          <span>{focusedRivals.length}</span>
        </article>
        <article className="summary-chip">
          <strong>Cargo Load</strong>
          <span>{Math.round(cargoLoad)} / {props.state.company.cargo_capacity + props.state.company.pack_animals * 18}</span>
        </article>
        <article className="summary-chip">
          <strong>Atlas Notes</strong>
          <span>{frontierLegend[0]}</span>
        </article>
      </div>

      <section className="atlas-cta-strip">
        <article className="atlas-cta-card">
          <small>Current Node</small>
          <strong>{currentNode?.name ?? 'Unknown position'}</strong>
          <p>
            {nextHiddenLandmark
              ? `This node still hides ${nextHiddenLandmark.kind}. Explore first.`
              : nextPlayableLandmark
                ? `${nextPlayableLandmark.name} is ready to be worked.`
                : 'No fresh site here. Travel or scout for a stronger lead.'}
          </p>
        </article>
        <div className="atlas-cta-actions">
          <button onClick={handleExploreAttempt}>
            {nextHiddenLandmark ? `Explore ${currentNode?.name ?? 'Node'}` : 'Node Fully Surveyed'}
          </button>
          <button
            onClick={() => {
              if (!nextPlayableLandmark) {
                props.onExplainAction('No site operation is ready at the current node yet. Explore first or move on.', 'info');
                return;
              }
              handleSiteAttempt(nextPlayableLandmark.id, nextPlayableLandmark.name, Boolean(nextPlayableLandmark.activated));
            }}
          >
            {nextPlayableLandmark ? `Open ${nextPlayableLandmark.name}` : 'No Site Operation Ready'}
          </button>
        </div>
      </section>

      <div className="world-map-layout">
        <div className="map-canvas world-map-canvas">
          <div className="map-zoom-layer" style={{ transform: `scale(${zoom})` }}>
            {regionBodies.map(({ region, left, top, width, height }) => (
              <div
                key={region.id}
                className={`region-body ${focusRegionId === 'all' || focusRegionId === region.id ? 'visible' : 'muted'} ${selectedRegion?.id === region.id ? 'focused' : ''}`}
                style={{
                  left: `${left}%`,
                  top: `${top}%`,
                  width: `${width}%`,
                  height: `${height}%`,
                  background: regionTint[region.id] ?? 'rgba(120, 120, 120, 0.22)'
                }}
              >
                <span>{region.name}</span>
              </div>
            ))}

            <div className="atlas-wind atlas-wind-north">North March</div>
            <div className="atlas-wind atlas-wind-sea">Salt Coast</div>

            {visibleRoutes.map((route) => {
              const from = nodeMap.get(route.from);
              const to = nodeMap.get(route.to);
              if (!from || !to) return null;
              const dx = to.x - from.x;
              const dy = to.y - from.y;
              const length = Math.sqrt(dx * dx + dy * dy);
              const angle = Math.atan2(dy, dx) * (180 / Math.PI);
              const active = selectedNode && (route.from === selectedNode.id || route.to === selectedNode.id);
              return (
                <div
                  key={route.id}
                  className={`route-line ${route.control} ${active ? 'active-route' : ''}`}
                  title={`${route.terrain} • patrol ${route.patrol_pressure ?? 0}${route.weather_locked ? ' • weather locked' : ''}${route.hidden ? ' • secret trail' : ''}`}
                  style={{
                    left: `${from.x}%`,
                    top: `${from.y}%`,
                    width: `${length}%`,
                    transform: `rotate(${angle}deg)`
                  }}
                />
              );
            })}

            {visibleNodes.map((node) => (
              <article
                key={node.id}
                className={`map-node world-node ${node.id === props.state.company_node_id ? 'current' : ''} ${selectedNode?.id === node.id ? 'selected-node' : ''} ${node.type}`}
                style={{ left: `${node.x}%`, top: `${node.y}%` }}
                onClick={() => setSelectedNodeId(node.id)}
              >
                <span className="node-icon">{nodeIcons[node.type]}</span>
                <strong>{node.name}</strong>
                <small>{factionMap.get(node.faction_control)?.name ?? 'Contested'}</small>
                <small>{nodeOverlay(node.id)}</small>
                {props.state.forward_posts.some((post) => post.node_id === node.id) && <span className="post-marker">Forward Post</span>}
                {(rivalsByNode.get(node.id) ?? []).slice(0, 2).map((rival) => (
                  <span key={rival.id} className="rival-marker">{rival.name}</span>
                ))}
                {props.state.landmarks.some((landmark) => landmark.node_id === node.id && landmark.discovered) && (
                  <span className="landmark-marker">Surveyed Site</span>
                )}
              </article>
            ))}
          </div>
        </div>

        <section className="panel atlas-panel">
          <h4>{selectedNode?.name ?? 'Selected Node'}</h4>
          <p>
            {selectedRegion?.name ?? 'Unknown region'} • {selectedNode?.type ?? 'unknown'} • {selectedNode?.tags.join(', ') ?? 'no tags'}
          </p>
          <p>
            Control: {selectedNode ? factionMap.get(selectedNode.faction_control)?.name ?? 'Unknown' : 'Unknown'} • danger {selectedNode?.danger ?? 0} • occupation {Math.round(selectedNode?.occupation ?? 0)}
          </p>
          <p>
            Market {selectedNode?.market ?? 0} • logistics {selectedNode?.logistics ?? 0} • recruit {selectedNode?.recruit ?? 0} • repair {selectedNode?.repair ?? 0}
          </p>
          <div className="atlas-site-list">
            <h5>Landmarks</h5>
            {selectedLandmarks.length === 0 && <p>No surveyed sites recorded here yet.</p>}
            {selectedLandmarks.map((landmark) => (
              <article key={landmark.id} className={`atlas-site-card ${selectedNode?.id === props.state.company_node_id && landmark.discovered && !landmark.activated ? 'site-ready' : ''}`}>
                <strong>{landmark.discovered ? landmark.name : 'Unsurveyed site'}</strong>
                <p>{landmark.discovered ? landmark.summary : 'Explore this node to reveal routes, shrines, ruins or harbor works tied to the local journey.'}</p>
                <small>{landmark.kind} • {landmark.discovered ? 'surveyed' : 'hidden'}</small>
                {landmark.discovered && (
                  <div className="atlas-site-actions">
                    <button
                      onClick={() => handleSiteAttempt(landmark.id, landmark.name, Boolean(landmark.activated))}
                    >
                      {landmark.activated
                        ? 'Site Worked'
                        : !selectedIsCurrentNode
                          ? `Travel to ${selectedNode?.name ?? 'this node'} to open`
                          : 'Open Site Operation'}
                    </button>
                  </div>
                )}
              </article>
            ))}
          </div>
          <div className="atlas-journey">
            <h5>Exploration And Journey</h5>
            <p>
              {selectedIsCurrentNode
                ? 'You are here. Explore this node, work the local economy or project force outward.'
                : 'You are viewing a remote node. Read its routes and sites here, then move the company before trying to operate locally.'}
            </p>
            {activeTravel && (
              <article className="atlas-travel-inline">
                <strong>Journey active to {nodeMap.get(activeTravel.to_node_id)?.name ?? 'destination'}</strong>
                <p>
                  {modeLabels[activeTravel.mode]} • day {activeTravel.progress_days}/{activeTravel.total_days}. Travel only advances when you click Advance Campaign Day.
                </p>
                <div className="atlas-site-actions">
                  <button onClick={props.onAdvanceDay}>Advance Campaign Day</button>
                  {!selectedIsCurrentNode && currentNode && (
                    <button onClick={() => setSelectedNodeId(currentNode.id)}>Return Focus To Company</button>
                  )}
                </div>
              </article>
            )}
            {!selectedIsCurrentNode && currentNode && (
              <div className="atlas-site-actions">
                <button onClick={() => setSelectedNodeId(currentNode.id)}>Return Focus To Company</button>
              </div>
            )}
            <div className="atlas-route-list">
              {selectedRoutes.length === 0 && <p>No routes from this node.</p>}
              {selectedRoutes.map((route) => {
                const destinationId = route.from === selectedNode?.id ? route.to : route.from;
                const destination = nodeMap.get(destinationId);
                if (!destination || !selectedNode) return null;
                return (
                  <article key={route.id} className="atlas-route-card">
                    <strong>{selectedNode.name} to {destination.name}</strong>
                    <p>
                      {route.terrain} • {route.access} • patrol {route.patrol_pressure ?? 0}
                      {route.weather_locked ? ' • weather locked' : ''}
                      {route.hidden ? ' • secret trail' : ''}
                    </p>
                    {!selectedIsCurrentNode && (
                      <small className="route-guidance">
                        Route planning preview only. Travel actions are available when the selected node is your current position.
                      </small>
                    )}
                    <div className="route-modes atlas-modes">
                      {route.travel_modes.slice(0, 5).map((mode) => (
                        <button
                          key={mode}
                          className={!selectedIsCurrentNode || Boolean(route.weather_locked) || Boolean(activeTravel) ? 'soft-blocked' : ''}
                          onClick={() => handleTravelAttempt(route.id, mode, route, destination.name)}
                          title={`${modeLabels[mode]}: ${estimateTravelDaysForState(props.state, route, mode)} days, ${estimateRouteSuppliesCost(route, mode)} supplies, ${Math.round(estimateRouteInterceptionRisk(props.state, route, mode) * 100)}% interception risk`}
                        >
                          {modeLabels[mode]}
                        </button>
                      ))}
                    </div>
                    {activeTravel && selectedIsCurrentNode && (
                      <small className="route-guidance route-guidance-live">
                        Journey already started. Advance the campaign day to continue the march.
                      </small>
                    )}
                  </article>
                );
              })}
            </div>
          </div>
        </section>
      </div>

      <div className="map-summary-grid">
        <article className="panel summary-list">
          <h4>Priority Contracts</h4>
          {focusedContracts.slice(0, 4).map((contract) => (
            <p key={contract.id}>
              {contract.title} • {contract.strategic_value} SV • {contract.deadline_days}d
            </p>
          ))}
          {focusedContracts.length === 0 && <p>No contracts in focus.</p>}
        </article>
        <article className="panel summary-list">
          <h4>Rival Activity</h4>
          {focusedRivals.slice(0, 4).map((rival) => (
            <p key={rival.id}>
              {rival.name} • {nodeMap.get(rival.node_id)?.name ?? 'unknown'} • hostility {rival.hostility_to_player}
            </p>
          ))}
          {focusedRivals.length === 0 && <p>No rivals in focus.</p>}
        </article>
      </div>
    </section>
  );
}
