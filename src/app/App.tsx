import { BattleLog } from '../components/game/BattleLog';
import { ContractCard } from '../components/game/ContractCard';
import { MercenaryCard } from '../components/game/MercenaryCard';
import { StrategicMap } from '../components/game/StrategicMap';
import { ResourceBar } from '../components/ui/ResourceBar';
import { TopNav } from '../components/ui/TopNav';
import { computeSynergies } from '../services/synergyEngine';
import { useGameController } from './useGameController';

export function App() {
  const game = useGameController();
  const synergies = computeSynergies(game.squad);
  const selectedBrief = game.selectedContract ? game.contractBriefs.find((entry) => entry.contractId === game.selectedContract?.id) : null;
  const discoveredLandmarks = game.state.landmarks.filter((landmark) => landmark.discovered).length;
  const secretRoutes = game.state.map_routes.filter((route) => route.hidden && route.discovered).length;
  const firstPlayableContract = game.localContracts[0] ?? game.travelContracts[0] ?? null;
  const averageLoyalty = Math.round(
    game.state.mercenaries.filter((mercenary) => mercenary.alive).reduce((sum, mercenary) => sum + mercenary.loyalty, 0) /
      Math.max(1, game.state.mercenaries.filter((mercenary) => mercenary.alive).length)
  );
  const averageStress = Math.round(
    game.state.mercenaries.filter((mercenary) => mercenary.alive).reduce((sum, mercenary) => sum + mercenary.stress, 0) /
      Math.max(1, game.state.mercenaries.filter((mercenary) => mercenary.alive).length)
  );
  const activeTravelDestination = game.state.map_nodes.find((node) => node.id === game.state.active_travel?.to_node_id) ?? null;
  const activeInterceptionDestination = game.state.map_nodes.find((node) => node.id === game.state.active_interception?.destination_node_id) ?? null;
  const hasFlowPopup =
    Boolean(game.state.active_travel) ||
    Boolean(game.state.active_journey_incident) ||
    Boolean(game.state.active_interception) ||
    Boolean(game.state.active_site_operation);
  const debugLines = game.state.chronicle.slice(0, 6);

  return (
    <div className="app-shell">
      <ResourceBar state={game.state} alerts={game.alerts} />
      <TopNav active={game.screen} onChange={game.setScreen} />

      <main className="layout-grid">
        {hasFlowPopup && (
          <section className="campaign-flow-popup">
            <div className="campaign-flow-popup__scrim" />
            <div className="panel campaign-flow-popup__card">
              {game.state.active_interception ? (
                <>
                  <small className="eyebrow">Route Clash</small>
                  <h3>Interception Blocking The March</h3>
                  <p>
                    {game.state.active_interception.type.replace('_', ' ')} are blocking the road to{' '}
                    <strong>{activeInterceptionDestination?.name ?? 'your destination'}</strong>.
                  </p>
                  <p>
                    Enemy power {game.state.active_interception.enemy_power} • stakes {game.state.active_interception.stakes} • delay {game.state.active_interception.delay_days}d
                  </p>
                  <div className="action-row">
                    <button onClick={() => game.answerInterception('breakthrough')}>Breakthrough</button>
                    <button onClick={() => game.answerInterception('guard_cargo')}>Guard Cargo</button>
                    <button onClick={() => game.answerInterception('withdraw')}>Withdraw</button>
                    <button onClick={() => game.answerInterception('counter_ambush')}>Counter-Ambush</button>
                  </div>
                </>
              ) : game.state.active_journey_incident ? (
                <>
                  <small className="eyebrow">Road Problem</small>
                  <h3>{game.state.active_journey_incident.title}</h3>
                  <p>{game.state.active_journey_incident.description}</p>
                  <p>
                    Danger {game.state.active_journey_incident.danger} • delay risk {game.state.active_journey_incident.delay_days}d
                  </p>
                  <div className="action-row">
                    <button onClick={() => game.answerJourneyIncident('push_on')}>Push On</button>
                    <button onClick={() => game.answerJourneyIncident('make_camp')}>Make Camp</button>
                    <button onClick={() => game.answerJourneyIncident('detour')}>Detour</button>
                    <button onClick={() => game.answerJourneyIncident('press_guides')}>Press Guides</button>
                  </div>
                </>
              ) : game.state.active_site_operation ? (
                <>
                  <small className="eyebrow">Site Operation</small>
                  <h3>{game.state.active_site_operation.title}</h3>
                  <p>{game.state.active_site_operation.description}</p>
                  <p>Resolve the landmark before pushing the campaign onward.</p>
                  <div className="action-row">
                    {game.state.active_site_operation.choices.includes('secure_cache') && (
                      <button onClick={() => game.resolveSiteOperation('secure_cache')}>Secure Cache</button>
                    )}
                    {game.state.active_site_operation.choices.includes('deep_survey') && (
                      <button onClick={() => game.resolveSiteOperation('deep_survey')}>Deep Survey</button>
                    )}
                    {game.state.active_site_operation.choices.includes('take_blessing') && (
                      <button onClick={() => game.resolveSiteOperation('take_blessing')}>Take Blessing</button>
                    )}
                    {game.state.active_site_operation.choices.includes('question_keepers') && (
                      <button onClick={() => game.resolveSiteOperation('question_keepers')}>Question Keepers</button>
                    )}
                    {game.state.active_site_operation.choices.includes('broker_deal') && (
                      <button onClick={() => game.resolveSiteOperation('broker_deal')}>Broker Deal</button>
                    )}
                    {game.state.active_site_operation.choices.includes('inspect_harbor') && (
                      <button onClick={() => game.resolveSiteOperation('inspect_harbor')}>Inspect Harbor</button>
                    )}
                  </div>
                </>
              ) : game.state.active_travel ? (
                <>
                  <small className="eyebrow">Journey Underway</small>
                  <h3>
                    {game.state.active_travel.mode.replace('_', ' ')} • day {game.state.active_travel.progress_days}/{game.state.active_travel.total_days}
                  </h3>
                  <p>
                    The company is moving toward <strong>{activeTravelDestination?.name ?? 'its destination'}</strong>. Travel only advances when you click the button below.
                  </p>
                  <p>
                    Supplies {game.state.active_travel.supplies_cost}/day • fatigue {game.state.active_travel.fatigue_cost}/day
                  </p>
                  <div className="action-row">
                    <button onClick={game.tickWorld}>Advance Campaign Day</button>
                  </div>
                </>
              ) : null}
            </div>
          </section>
        )}

        {game.actionNotice && (
          <section className={`panel action-notice ${game.actionNotice.tone}`}>
            <div>
              <h3>{game.actionNotice.tone === 'warn' ? 'Action Blocked' : game.actionNotice.tone === 'success' ? 'Action Confirmed' : 'Action Update'}</h3>
              <p>{game.actionNotice.message}</p>
            </div>
            <div className="action-row">
              <button onClick={game.clearActionNotice}>Dismiss</button>
            </div>
          </section>
        )}

        <aside className="panel observer-panel">
          <div className="observer-panel__header">
            <div>
              <small className="eyebrow">Live Observer</small>
              <h3>Campaign State</h3>
            </div>
          </div>
          <div className="observer-grid">
            <article>
              <strong>Screen</strong>
              <span>{game.screen}</span>
            </article>
            <article>
              <strong>Node</strong>
              <span>{game.currentNode?.name ?? 'Unknown'}</span>
            </article>
            <article>
              <strong>Travel</strong>
              <span>
                {game.state.active_travel
                  ? `${game.state.active_travel.mode.replace('_', ' ')} ${game.state.active_travel.progress_days}/${game.state.active_travel.total_days}`
                  : 'idle'}
              </span>
            </article>
            <article>
              <strong>Incident</strong>
              <span>{game.state.active_journey_incident?.title ?? 'none'}</span>
            </article>
            <article>
              <strong>Intercept</strong>
              <span>{game.state.active_interception?.type.replace('_', ' ') ?? 'none'}</span>
            </article>
            <article>
              <strong>Site Op</strong>
              <span>{game.state.active_site_operation?.title ?? 'none'}</span>
            </article>
          </div>
          <div className="observer-highlight">
            <strong>Next Required Step</strong>
            <p>
              {game.state.active_interception
                ? 'Resolve the interception popup.'
                : game.state.active_journey_incident
                  ? 'Resolve the journey incident popup.'
                  : game.state.active_site_operation
                    ? 'Resolve the site operation popup.'
                    : game.state.active_travel
                      ? 'Click Advance Campaign Day.'
                      : 'Choose a map action or contract.'}
            </p>
          </div>
          <div className="observer-highlight">
            <strong>Latest Action Notice</strong>
            <p>{game.actionNotice?.message ?? 'No current notice.'}</p>
          </div>
          <div className="observer-log">
            <strong>Latest Chronicle Lines</strong>
            {debugLines.length === 0 ? (
              <p>No chronicle lines yet.</p>
            ) : (
              debugLines.map((line, index) => <p key={`${index}-${line}`}>{line}</p>)
            )}
          </div>
        </aside>

        {game.showOnboarding && (
          <section className="panel onboarding-panel">
            <h2>Campaign Briefing</h2>
            <p>This game is won on movement and timing first, battle second. Read the map, choose contracts you can actually reach, and keep your company supplied.</p>
            <div className="onboarding-grid">
              <article>
                <strong>1. Read The Map</strong>
                <p>Routes carry ETA, access, weather locks and interception risk. Position decides what work is real.</p>
              </article>
              <article>
                <strong>2. Protect Logistics</strong>
                <p>Supplies, medicine, ammunition, cargo and posts decide whether success can be sustained.</p>
              </article>
              <article>
                <strong>3. Pick Contracts Strategically</strong>
                <p>Some jobs pay more than they are worth if they drag you into a bad region at the wrong time.</p>
              </article>
              <article>
                <strong>4. Watch Company Morale</strong>
                <p>Loyalty, stress, wounds and payroll pressure can break the company without losing a battle.</p>
              </article>
            </div>
            <div className="action-row">
              <button onClick={game.dismissOnboarding}>Enter Campaign</button>
            </div>
          </section>
        )}

        <section className="panel command-strip">
          <div>
            <h3>Campaign Priorities</h3>
            {game.priorities.length === 0 ? <p>No urgent priorities. Push the map.</p> : game.priorities.map((entry) => <p key={entry}>{entry}</p>)}
          </div>
          <div>
            <h3>Alerts</h3>
            {game.alerts.length === 0 ? <p>No acute alerts.</p> : game.alerts.map((entry) => <p key={entry}>{entry}</p>)}
          </div>
        </section>

        <section className="panel progress-briefing">
          <div>
            <small className="eyebrow">Campaign Progress</small>
            <h3>{game.campaignProgressView.title}</h3>
            <p>{game.campaignProgressView.summary}</p>
            <p>
              Status <strong>{game.state.campaign_status}</strong> • Progress <strong>{game.state.company.campaign_progress}</strong> • Momentum{' '}
              <strong>{game.campaignProgressView.momentum}</strong>
            </p>
          </div>
          <div className="progress-briefing__signals">
            <article>
              <strong>What Counts As Progress</strong>
              {game.campaignProgressView.growthSignals.length === 0
                ? <p>You have not built enough momentum yet. Finish contracts, travel successfully, and establish logistics.</p>
                : game.campaignProgressView.growthSignals.map((signal) => <p key={signal}>{signal}</p>)}
            </article>
            <article>
              <strong>What Is Holding You Back</strong>
              {game.campaignProgressView.dragSignals.length === 0
                ? <p>No major drag right now. This is a good window to press outward.</p>
                : game.campaignProgressView.dragSignals.map((signal) => <p key={signal}>{signal}</p>)}
            </article>
          </div>
          <div className="goal-checklist">
            {game.campaignProgressView.goals.map((goal) => (
              <article key={goal.id} className={goal.done ? 'done' : ''}>
                <strong>{goal.done ? 'Done' : 'Next Goal'}: {goal.label}</strong>
                <p>{goal.detail}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="panel command-strip">
          <div>
            <h3>Context Tips</h3>
            {game.contextualTips.length === 0 ? <p>No contextual tip right now.</p> : game.contextualTips.map((entry) => <p key={entry}>{entry}</p>)}
          </div>
          <div>
            <h3>How To Read This Demo</h3>
            <p>Start on the atlas. Discover a site. Travel with intent. Take one contract. Watch the frontier answer back.</p>
          </div>
        </section>

        <section className="panel demo-spotlight">
          <div>
            <small className="eyebrow">Playable Slice</small>
            <h2>Mercenary atlas campaign with travel, discovery and territorial pressure.</h2>
            <p>
              This demo is strongest when played as a short frontier run: read the map, open a landmark, survive a journey incident,
              then execute a contract before the world shifts again.
            </p>
          </div>
          <div className="demo-spotlight-stats">
            <article>
              <strong>{discoveredLandmarks}</strong>
              <span>Surveyed Sites</span>
            </article>
            <article>
              <strong>{secretRoutes}</strong>
              <span>Secret Routes</span>
            </article>
            <article>
              <strong>{game.state.contracts.filter((contract) => contract.status === 'available').length}</strong>
              <span>Live Contracts</span>
            </article>
          </div>
        </section>

        <section className="panel demo-flow">
          <article>
            <small className="eyebrow">First Session</small>
            <h3>Recommended Route</h3>
            <p>1. Explore the current node. 2. Open a site operation. 3. Move on the atlas. 4. Answer the road. 5. Take a contract.</p>
          </article>
          <article>
            <small className="eyebrow">Current Hook</small>
            <h3>{firstPlayableContract?.title ?? 'No immediate hook'}</h3>
            <p>{firstPlayableContract?.briefing ?? 'Advance a day or explore a site to surface the next strong lead.'}</p>
          </article>
          <article>
            <small className="eyebrow">What To Watch</small>
            <h3>Frontier Response</h3>
            <p>Routes, landmarks, rival pressure, deadlines and morale should all change what “the right move” means.</p>
          </article>
        </section>

        {(game.state.active_travel || game.state.active_journey_incident || game.state.active_interception || game.state.active_site_operation) && (
          <section className="sticky-next-step">
            {game.state.active_interception ? (
              <>
                <strong>Interception active</strong>
                <span>Resolve the route clash before anything else.</span>
              </>
            ) : game.state.active_journey_incident ? (
              <>
                <strong>Journey incident active</strong>
                <span>Choose how the column handles the road problem.</span>
              </>
            ) : game.state.active_site_operation ? (
              <>
                <strong>Site operation active</strong>
                <span>Pick an approach to resolve the landmark.</span>
              </>
            ) : (
              <>
                <strong>Journey active</strong>
                <span>
                  To reach {game.state.map_nodes.find((node) => node.id === game.state.active_travel?.to_node_id)?.name ?? 'the destination'},
                  click Advance Campaign Day.
                </span>
              </>
            )}
            {game.state.active_travel && !game.state.active_journey_incident && !game.state.active_interception && !game.state.active_site_operation && (
              <button onClick={game.tickWorld}>Advance Campaign Day</button>
            )}
          </section>
        )}

        {game.lastDailySummary && (
          <section className="panel summary-banner">
            <h3>Daily Campaign Summary</h3>
            <div className="stat-row">
              <span>Day {game.lastDailySummary.day}</span>
              <span>Gold {game.lastDailySummary.goldDelta >= 0 ? '+' : ''}{game.lastDailySummary.goldDelta}</span>
              <span>Supplies {game.lastDailySummary.suppliesDelta >= 0 ? '+' : ''}{game.lastDailySummary.suppliesDelta}</span>
              <span>Open contracts {game.lastDailySummary.contractsAvailable}</span>
              <span>Rival regions {game.lastDailySummary.rivalRegions}</span>
              <span>Sieges {game.lastDailySummary.siegeRegions}</span>
            </div>
            <p>{game.lastDailySummary.note}</p>
          </section>
        )}

        {game.latestMissionRun && game.screen !== 'chronicle' && (
          <section className="panel summary-banner">
            <h3>Latest Mission Result</h3>
            <div className="stat-row">
              <span>Outcome {game.latestMissionRun.outcome.replaceAll('_', ' ')}</span>
              <span>Reward {game.latestMissionRun.reward_gold}g</span>
              <span>Reputation {game.latestMissionRun.reputation_delta >= 0 ? '+' : ''}{game.latestMissionRun.reputation_delta}</span>
            </div>
            <p>Open Chronicle to review battle flow, archive rewards and campaign consequences in detail.</p>
          </section>
        )}

        {game.state.active_interception && (
          <section className="panel interception-panel">
            <h3>Route Interception</h3>
            <p>
              {game.state.active_interception.type.replace('_', ' ')} threaten the road to{' '}
              {game.state.map_nodes.find((node) => node.id === game.state.active_interception?.destination_node_id)?.name ?? 'your destination'}.
            </p>
            <p>
              Enemy power {game.state.active_interception.enemy_power} • stakes {game.state.active_interception.stakes} • delay {game.state.active_interception.delay_days}d
              {game.state.active_interception.discovered ? ' • scouts saw them first' : ''}
            </p>
            <div className="action-row">
              <button onClick={() => game.answerInterception('breakthrough')}>Breakthrough</button>
              <button onClick={() => game.answerInterception('guard_cargo')}>Guard Cargo</button>
              <button onClick={() => game.answerInterception('withdraw')}>Withdraw</button>
              <button onClick={() => game.answerInterception('counter_ambush')}>Counter-Ambush</button>
            </div>
          </section>
        )}

        {game.state.active_site_operation && (
          <section className="panel interception-panel">
            <h3>Site Operation</h3>
            <p>
              <strong>{game.state.active_site_operation.title}</strong> • {game.state.active_site_operation.description}
            </p>
            <p>Choose how the company handles this site. The approach decides whether you leave with rest, intelligence, contraband or a harder follow-up lead.</p>
            <div className="action-row">
              {game.state.active_site_operation.choices.includes('secure_cache') && (
                <button onClick={() => game.resolveSiteOperation('secure_cache')}>Secure Cache</button>
              )}
              {game.state.active_site_operation.choices.includes('deep_survey') && (
                <button onClick={() => game.resolveSiteOperation('deep_survey')}>Deep Survey</button>
              )}
              {game.state.active_site_operation.choices.includes('take_blessing') && (
                <button onClick={() => game.resolveSiteOperation('take_blessing')}>Take Blessing</button>
              )}
              {game.state.active_site_operation.choices.includes('question_keepers') && (
                <button onClick={() => game.resolveSiteOperation('question_keepers')}>Question Keepers</button>
              )}
              {game.state.active_site_operation.choices.includes('broker_deal') && (
                <button onClick={() => game.resolveSiteOperation('broker_deal')}>Broker Deal</button>
              )}
              {game.state.active_site_operation.choices.includes('inspect_harbor') && (
                <button onClick={() => game.resolveSiteOperation('inspect_harbor')}>Inspect Harbor</button>
              )}
            </div>
          </section>
        )}

        {game.state.active_journey_incident && (
          <section className="panel interception-panel">
            <h3>Journey Incident</h3>
            <p>
              <strong>{game.state.active_journey_incident.title}</strong> • {game.state.active_journey_incident.description}
            </p>
            <p>
              Danger {game.state.active_journey_incident.danger} • delay risk {game.state.active_journey_incident.delay_days}d
            </p>
            <div className="action-row">
              <button onClick={() => game.answerJourneyIncident('push_on')}>Push On</button>
              <button onClick={() => game.answerJourneyIncident('make_camp')}>Make Camp</button>
              <button onClick={() => game.answerJourneyIncident('detour')}>Detour</button>
              <button onClick={() => game.answerJourneyIncident('press_guides')}>Press Guides</button>
            </div>
          </section>
        )}

        {game.screen === 'map' && game.state.active_travel && (
          <section className="panel travel-guidance-banner">
            <div>
              <h3>Journey Started</h3>
              <p>
                The company is already on the road to{' '}
                <strong>{game.state.map_nodes.find((node) => node.id === game.state.active_travel?.to_node_id)?.name ?? 'its destination'}</strong>
                {' '}by {game.state.active_travel.mode.replace('_', ' ')}. Travel does not resolve instantly.
              </p>
              <p>
                Next step: click <strong>Advance Campaign Day</strong> to move the journey forward and trigger incidents, interceptions or arrival.
              </p>
            </div>
            <div className="action-row">
              <button onClick={game.tickWorld}>Advance Campaign Day</button>
            </div>
          </section>
        )}

        {game.screen === 'dashboard' && (
          <>
            <section className="panel hero">
              <h2>War Table</h2>
              <p>The frontier now turns on geography. Your position, route, supplies and timing decide which wars you can reach before rivals do.</p>
              <div className="action-row">
                <button title="Advance all world systems by one campaign day." onClick={game.tickWorld}>Advance Campaign Day</button>
                <button title="Hire a recruit from the current location if the node supports it." onClick={game.hireLocalRecruit}>Recruit Local Mercenary</button>
                <button title="Buy provisions at the current node." onClick={game.resupplyCompany}>Resupply</button>
                <button title="Improve contract intel in the surrounding region." onClick={game.scoutRegion}>Scout Region</button>
                <button title="Purchase medicine and ammunition for field operations." onClick={game.buyStock}>Buy Campaign Stock</button>
                <button title="Expand carrying capacity and campaign endurance." onClick={game.acquirePackAnimal}>Buy Pack Animal</button>
                <button title="Acquire legal passage for controlled territory." onClick={game.acquirePermit}>Buy Regional Permit</button>
                <button title="Load speculative cargo for trade runs." onClick={game.loadTradeGoods}>Load Trade Goods</button>
                <button title="Sell carried trade goods into the local market." onClick={game.unloadTradeGoods}>Sell Trade Goods</button>
                <button title="Establish a forward post at the current node." onClick={game.establishPost}>Establish Forward Post</button>
                {game.remoteSyncEnabled && (
                  <button title="Push or pull the current campaign state to remote persistence." onClick={game.syncRemote}>Sync Supabase</button>
                )}
                <button title="Reset the campaign and show onboarding again." onClick={game.resetCampaign}>Reset Campaign</button>
              </div>
            </section>
            <section className="panel">
              <h3>Campaign Posture</h3>
              <p>
                Current node: <strong>{game.currentNode?.name ?? 'Unknown'}</strong>
              </p>
              <p>
                Season: <strong>{game.state.season}</strong> • Weather: <strong>{game.state.weather}</strong> • Permits: {game.state.company.permits.length}
              </p>
              <p>
                Travel policy: <strong>{game.state.company.travel_policy}</strong> • Trade goods: <strong>{game.state.company.trade_goods}</strong> • Pack animals: <strong>{game.state.company.pack_animals}</strong>
              </p>
              <p>
                Campaign: <strong>{game.state.campaign_status}</strong> • Progress: <strong>{game.state.company.campaign_progress}</strong>
              </p>
              {game.state.active_travel ? (
                <p>
                  In transit to {game.state.map_nodes.find((node) => node.id === game.state.active_travel?.to_node_id)?.name ?? 'destination'}
                  {' '}via {game.state.active_travel.mode.replace('_', ' ')}.
                </p>
              ) : (
                <p>{game.localContracts.length} local contracts ready. {game.travelContracts.length} more require movement.</p>
              )}
              <h3>Active Pressures</h3>
              {game.state.events.map((e) => (
                <article className="event-banner" key={e.id}>
                  <strong>{e.title}</strong>
                  <p>{e.description}</p>
                  <small>Severity {e.severity} • {e.duration_days}d remaining</small>
                </article>
              ))}
            </section>
          </>
        )}

        {game.screen === 'mercenaries' && (
          <section className="card-grid">
            {game.state.mercenaries.map((m) => (
              <MercenaryCard key={m.id} mercenary={m} selected={game.squadIds.includes(m.id)} onClick={() => game.toggleSquad(m.id)} />
            ))}
          </section>
        )}

        {game.screen === 'contracts' && (
          <>
            <section className="card-grid">
              {game.localContracts.length === 0 && (
                <article className="panel">
                  <h3>No Local Contracts</h3>
                  <p>Nothing immediate is available at your present node. Scout, advance the day or move on the map.</p>
                </article>
              )}
              {game.localContracts.map((c) => (
                <ContractCard
                  key={c.id}
                  contract={c}
                  selected={game.selectedContract?.id === c.id}
                  intel={game.contractIntel(c)}
                  locationLabel={`${game.state.map_nodes.find((node) => node.id === c.location_node_id)?.name ?? 'Local'} • ETA ${game.contractBriefs.find((entry) => entry.contractId === c.id)?.eta ?? 0}d`}
                  onSelect={() => game.setSelectedContractId(c.id)}
                />
              ))}
            </section>
            <section className="panel">
              <h3>Contract Action</h3>
              <p>Selected: {game.selectedContract?.title ?? 'None'}</p>
              {game.selectedContract && (
                <p>
                  Patron: {game.selectedContract.patron ?? 'Unknown'} • Theme: {game.selectedContract.theme ?? 'mixed'} • Failure cost {game.selectedContract.failure_cost ?? 0}g
                </p>
              )}
              <p>
                {game.state.active_travel
                  ? 'The company is traveling. Finish the journey before deploying.'
                  : game.selectedContract?.location_node_id && game.selectedContract.location_node_id !== game.state.company_node_id
                    ? 'You are not at the contract location yet.'
                    : 'You are in position to execute the local contract.'}
              </p>
              {selectedBrief && <p>ETA by guided route: {selectedBrief.eta ?? '-'} days{selectedBrief.late ? ' • likely too late' : ''}</p>}
              {game.selectedContract?.extraction_node_id && (
                <p>
                  Extraction: {game.state.map_nodes.find((node) => node.id === game.selectedContract?.extraction_node_id)?.name ?? 'unknown'}
                </p>
              )}
              <div className="action-row">
                <button title="Trade deadline slack for a better payout." disabled={!game.selectedContract || Boolean(game.selectedContract.negotiated)} onClick={game.negotiateSelectedContract}>
                  Negotiate Hazard Pay
                </button>
              <button
                title="Run the selected contract with the current squad if the company is already on site."
                disabled={
                  !game.selectedContract ||
                  Boolean(game.state.active_travel) ||
                  (Boolean(game.selectedContract.location_node_id) && game.selectedContract.location_node_id !== game.state.company_node_id)
                }
                onClick={() => game.executeMission()}
              >
                Execute Local Contract
              </button>
              </div>
            </section>
            <section className="panel">
              <h3>Distant Opportunities</h3>
              <div className="card-grid compact">
                {game.travelContracts.length === 0 && (
                  <article className="panel">
                    <h3>No Remote Leads</h3>
                    <p>The frontier is temporarily quiet. Rival movement, weather and war pressure will open new routes.</p>
                  </article>
                )}
                {game.travelContracts.map((c) => (
                  <ContractCard
                    key={c.id}
                    contract={c}
                    selected={false}
                    intel={game.contractIntel(c)}
                    locationLabel={`${game.state.map_nodes.find((node) => node.id === c.location_node_id)?.name ?? 'Remote'} • ETA ${game.contractBriefs.find((entry) => entry.contractId === c.id)?.eta ?? '?'}d${game.contractBriefs.find((entry) => entry.contractId === c.id)?.late ? ' • late risk' : ''}`}
                    onSelect={() => {
                      game.setSelectedContractId(c.id);
                      game.setScreen('map');
                    }}
                  />
                ))}
              </div>
            </section>
          </>
        )}

        {game.screen === 'squad' && (
          <>
            <section className="panel">
              <h3>Squad Formation</h3>
              <p>Selected mercenaries: {game.squad.length} / 6</p>
              <div className="card-grid compact">
                {game.squad.map((m) => <MercenaryCard key={m.id} mercenary={m} selected onClick={() => game.toggleSquad(m.id)} />)}
              </div>
            </section>
            <section className="panel">
              <h3>Active Synergies</h3>
              {synergies.map((s) => (
                <p key={s.name} className={s.active ? 'synergy on' : 'synergy'}>
                  {s.name}: {s.description}
                </p>
              ))}
            </section>
          </>
        )}

        {game.screen === 'map' && (
          <>
            <StrategicMap
              state={game.state}
              onTravel={game.travelTo}
              onBeginSiteOperation={game.beginSiteOperation}
              onExploreCurrentNode={game.exploreNode}
              onAdvanceDay={game.tickWorld}
              onExplainAction={game.explainAction}
            />
            <section className="panel">
              <h3>Field Operations</h3>
              <div className="stat-row">
                <span>{game.currentNode?.name ?? 'Current node'}</span>
                <span>Market {game.currentNode?.market ?? 0}</span>
                <span>Recruit {game.currentNode?.recruit ?? 0}</span>
                <span>Repair {game.currentNode?.repair ?? 0}</span>
                <span>Logistics {game.currentNode?.logistics ?? 0}</span>
                <span>Tension {game.currentNode?.political_tension ?? 0}</span>
              </div>
              <div className="stat-row">
                <span>Supplies {game.marketSnapshot.supplies}g</span>
                <span>Medicine {game.marketSnapshot.medicine}g</span>
                <span>Ammo {game.marketSnapshot.ammunition}g</span>
                <span>Animal {game.marketSnapshot.animals}g</span>
                <span>Permit {game.marketSnapshot.permit}g</span>
                <span>Trade {game.marketSnapshot.tradeGoodsBuy}/{game.marketSnapshot.tradeGoodsSell}g</span>
              </div>
              <p className="map-helper-copy">
                Core loop here: explore the current node, open a site operation if one appears, then move on the atlas.
              </p>
              <div className="action-row">
                <button title="Buy general supplies." disabled={Boolean(game.state.active_travel)} onClick={game.resupplyCompany}>Buy Supplies</button>
                <button title="Improve regional contract intel." disabled={Boolean(game.state.active_travel)} onClick={game.scoutRegion}>Run Scouts</button>
                <button title="Explore the current node and its immediate surroundings for routes, stories and local advantage." disabled={Boolean(game.state.active_travel)} onClick={game.exploreNode}>Explore Surroundings</button>
                <button title="Hire based on current node quality and type." disabled={Boolean(game.state.active_travel)} onClick={game.hireLocalRecruit}>Hire from This Node</button>
                <button title="Buy ammunition and medical stores." disabled={Boolean(game.state.active_travel)} onClick={game.buyStock}>Buy Stock</button>
                <button title="Increase carrying capacity." disabled={Boolean(game.state.active_travel)} onClick={game.acquirePackAnimal}>Buy Animal</button>
                <button title="Buy local travel permission if needed." disabled={Boolean(game.state.active_travel)} onClick={game.acquirePermit}>Buy Permit</button>
                <button title="Load speculative cargo for trade." disabled={Boolean(game.state.active_travel)} onClick={game.loadTradeGoods}>Load Cargo</button>
                <button title="Sell cargo into this market." disabled={Boolean(game.state.active_travel)} onClick={game.unloadTradeGoods}>Sell Cargo</button>
                <button title="Project logistics into this node." disabled={Boolean(game.state.active_travel)} onClick={game.establishPost}>Establish Forward Post</button>
                <button title="Improve local market, logistics and repairs over time." disabled={Boolean(game.state.active_travel)} onClick={game.investLocally}>Invest Locally</button>
                <button title="Hire a generic recruit independent of node origin." onClick={game.hireRecruit}>Recruit Generic Prospect</button>
              </div>
              <div className="action-row">
                <button className={game.state.company.travel_policy === 'evade' ? 'active-policy' : ''} onClick={() => game.changeTravelPolicy('evade')}>Policy: Evade</button>
                <button className={game.state.company.travel_policy === 'bribe' ? 'active-policy' : ''} onClick={() => game.changeTravelPolicy('bribe')}>Policy: Bribe</button>
                <button className={game.state.company.travel_policy === 'fight' ? 'active-policy' : ''} onClick={() => game.changeTravelPolicy('fight')}>Policy: Fight</button>
              </div>
              <p>
                Surveyed sites nearby: {game.state.landmarks.filter((landmark) => landmark.node_id === game.state.company_node_id && landmark.discovered).length}
                {' '}• secret routes charted {game.state.map_routes.filter((route) => route.hidden && route.discovered).length}
                {' '}• logistics pressure from animals {game.state.company.pack_animals}, posts {game.state.forward_posts.length} and cargo {game.state.company.trade_goods}
              </p>
              {game.state.forward_posts.length > 0 && (
                <>
                  <p>Forward posts: {game.state.forward_posts.map((post) => game.state.map_nodes.find((node) => node.id === post.node_id)?.name ?? post.node_id).join(', ')}</p>
                  {game.state.forward_posts.some((post) => post.node_id === game.state.company_node_id) && (
                    <>
                      <p>
                        Local post stores: {
                          game.state.forward_posts.find((post) => post.node_id === game.state.company_node_id)?.stash_supplies ?? 0
                        } supplies • {
                          game.state.forward_posts.find((post) => post.node_id === game.state.company_node_id)?.stash_medicine ?? 0
                        } medicine • {
                          game.state.forward_posts.find((post) => post.node_id === game.state.company_node_id)?.stash_ammunition ?? 0
                        } ammunition • guard {
                          Math.round(game.state.forward_posts.find((post) => post.node_id === game.state.company_node_id)?.guard_rating ?? 0)
                        } • integrity {
                          Math.round(game.state.forward_posts.find((post) => post.node_id === game.state.company_node_id)?.integrity ?? 0)
                        } • level {
                          game.state.forward_posts.find((post) => post.node_id === game.state.company_node_id)?.level ?? 0
                        } • {
                          game.state.forward_posts.find((post) => post.node_id === game.state.company_node_id)?.specialty ?? 'supply'
                        }
                      </p>
                      <div className="action-row">
                        <button disabled={Boolean(game.state.active_travel)} onClick={game.depositAtPost}>Deposit Supplies</button>
                        <button disabled={Boolean(game.state.active_travel)} onClick={game.withdrawFromPost}>Withdraw Supplies</button>
                        <button disabled={Boolean(game.state.active_travel)} onClick={game.fortifyPost}>Fortify Post</button>
                        <button disabled={Boolean(game.state.active_travel)} onClick={() => game.specializePost('supply')}>Supply Focus</button>
                        <button disabled={Boolean(game.state.active_travel)} onClick={() => game.specializePost('medical')}>Medical Focus</button>
                        <button disabled={Boolean(game.state.active_travel)} onClick={() => game.specializePost('military')}>Military Focus</button>
                      </div>
                    </>
                  )}
                </>
              )}
            </section>
            {game.selectedContract?.location_node_id && game.selectedContract.location_node_id !== game.state.company_node_id && (
              <section className="panel">
                <h3>Operation Planner</h3>
                <p>
                  Target: <strong>{game.selectedContract.title}</strong> at{' '}
                  {game.state.map_nodes.find((node) => node.id === game.selectedContract?.location_node_id)?.name ?? 'remote node'}
                </p>
                <p>
                  Default route preview:{' '}
                  {game.selectedTravelPlan
                    ? `${game.selectedTravelPlan.route_ids.length} legs / ETA ${game.selectedTravelEta ?? '?'}d toward ${
                        game.state.map_nodes.find((node) => node.id === game.selectedTravelPlan?.target_node_id)?.name ?? 'target'
                      }${selectedBrief?.late ? ' • likely late' : ''}`
                    : 'No viable route with current map access.'}
                </p>
                <div className="action-row">
                  <button disabled={!game.selectedContract.location_node_id || Boolean(game.state.active_travel)} onClick={() => game.deployToNode(game.selectedContract!.location_node_id!, 'horses')}>
                    Deploy by Horses
                  </button>
                  <button disabled={!game.selectedContract.location_node_id || Boolean(game.state.active_travel)} onClick={() => game.deployToNode(game.selectedContract!.location_node_id!, 'foot')}>
                    Deploy on Foot
                  </button>
                  <button disabled={!game.selectedContract.location_node_id || Boolean(game.state.active_travel)} onClick={() => game.deployToNode(game.selectedContract!.location_node_id!, 'stealth_column')}>
                    Deploy Stealth Column
                  </button>
                  <button disabled={!game.selectedContract.location_node_id || Boolean(game.state.active_travel)} onClick={() => game.deployToNode(game.selectedContract!.location_node_id!, 'guided_route')}>
                    Deploy with Guides
                  </button>
                </div>
              </section>
            )}
            <section className="card-grid">
              {game.state.regions.map((r) => {
                const fame = game.state.region_fame.find((f) => f.regionId === r.id);
                return (
                  <article key={r.id} className="panel region-node">
                    <h3>{r.name}</h3>
                    <p>{r.biome}</p>
                    <div className="stat-row">
                      <span>Danger {r.danger_level}</span>
                      <span>Stability {r.stability}</span>
                      <span>Pressure {r.threat_pressure}</span>
                      <span>Control {game.state.factions.find((f) => f.id === r.faction_control)?.name ?? r.faction_control}</span>
                    </div>
                    <div className="stat-row">
                      <span>Fame {Math.round(fame?.fame ?? 0)}</span>
                      <span>Reliability {Math.round(fame?.reliability ?? 0)}</span>
                      <span>Brutality {Math.round(fame?.brutality ?? 0)}</span>
                      <span>Rivals {Math.round(r.rival_presence)}</span>
                    </div>
                    <small>{r.unlocked ? 'Unlocked' : 'Locked'} • Front {r.front_state}</small>
                    <small>
                      Nodes under strain: {game.state.map_nodes.filter((node) => node.region_id === r.id && (node.occupation < 50 || node.siege_days > 0)).length}
                    </small>
                  </article>
                );
              })}
            </section>
          </>
        )}

        {game.screen === 'base' && (
          <>
            <section className="panel">
              <h2>Company Seat</h2>
              <div className="stat-row">
                <span>Campaign {game.state.campaign_status}</span>
                <span>Progress {game.state.company.campaign_progress}</span>
                <span>Average loyalty {averageLoyalty}</span>
                <span>Average stress {averageStress}</span>
                <span>Posts {game.state.forward_posts.length}</span>
              </div>
              <p>
                The base now anchors the campaign: upgrades shape recovery and command while forward posts extend range, stock and control.
              </p>
            </section>
            <section className="card-grid">
              {game.state.base_upgrades.map((up) => (
                <article className="panel" key={up.id}>
                  <h3>{up.type}</h3>
                  <p>Level {up.level} • Effect {up.effect_value.toFixed(2)}</p>
                  <button onClick={() => game.applyBaseUpgrade(up.type)}>Upgrade</button>
                </article>
              ))}
            </section>
            <section className="card-grid">
              {game.state.forward_posts.length === 0 && (
                <article className="panel">
                  <h3>No Forward Posts</h3>
                  <p>Establish a post from the map to project supplies, medicine and force into a contested corridor.</p>
                </article>
              )}
              {game.state.forward_posts.map((post) => (
                <article className="panel" key={post.id}>
                  <h3>{game.state.map_nodes.find((node) => node.id === post.node_id)?.name ?? post.node_id}</h3>
                  <p>
                    Level {post.level} • integrity {Math.round(post.integrity)} • guard {Math.round(post.guard_rating)} • {post.specialty}
                  </p>
                  <div className="stat-row">
                    <span>Supplies {post.stash_supplies}</span>
                    <span>Medicine {post.stash_medicine}</span>
                    <span>Ammo {post.stash_ammunition}</span>
                  </div>
                  <small>
                    Region: {game.state.regions.find((region) => region.id === game.state.map_nodes.find((node) => node.id === post.node_id)?.region_id)?.name ?? 'Unknown'}
                  </small>
                </article>
              ))}
            </section>
            <section className="card-grid">
              <article className="panel">
                <h3>Field Archive</h3>
                {game.state.library.length === 0 && <p>No texts recovered yet.</p>}
                {game.state.library.slice(0, 4).map((entry) => (
                  <article key={entry.id} className="archive-entry">
                    <strong>{entry.title}</strong>
                    <p>{entry.summary}</p>
                    <small>{entry.category.replace('_', ' ')} • {entry.rarity} • {entry.acquired_from}</small>
                  </article>
                ))}
              </article>
              <article className="panel">
                <h3>Armory Holdings</h3>
                {game.state.stash.length === 0 && <p>No reserve relics or wargear in storage.</p>}
                {game.state.stash.slice(0, 4).map((item) => (
                  <article key={item.id} className="archive-entry">
                    <strong>{item.name}</strong>
                    <p>{item.description ?? 'No description recorded.'}</p>
                    <small>{item.rarity} • {item.provenance ?? 'Unknown provenance'}</small>
                  </article>
                ))}
              </article>
            </section>
          </>
        )}

        {game.screen === 'rivals' && (
          <section className="card-grid">
            {game.state.rivals.map((r) => (
              <article className="panel rival-card" key={r.id}>
                <h3>{r.name}</h3>
                <p>{r.doctrine} doctrine • {r.specialty}</p>
                <p>Captain: {r.captain_name}</p>
                <p>Banner: {r.banner}</p>
                {r.legend && <p>{r.legend}</p>}
                <div className="stat-row">
                  <span>Strength {r.strength_rating}</span>
                  <span>Reputation {r.reputation}</span>
                  <span>Hostility {r.hostility_to_player}</span>
                </div>
                <small>
                  Focus: {game.state.regions.find((x) => x.id === r.region_focus)?.name ?? 'Unknown'}
                  {' '}• Position: {game.state.map_nodes.find((node) => node.id === r.node_id)?.name ?? 'Unknown'}
                </small>
                <small>
                  Objective: {r.objective?.replace('_', ' ') ?? 'unknown'}
                  {' '}• Target: {game.state.map_nodes.find((node) => node.id === r.target_node_id)?.name ?? 'none'}
                </small>
                {r.grudges.length > 0 && <small>Grudges: {r.grudges.join(' | ')}</small>}
              </article>
            ))}
          </section>
        )}

        {game.screen === 'chronicle' && (
          <>
            <BattleLog entries={game.lastMissionLog} />
            <section className="panel chronicle">
              <h3>Company Chronicle</h3>
              {game.state.chronicle.length === 0 && <p>No entries yet.</p>}
              {game.state.chronicle.map((entry, idx) => <p key={`${idx}-${entry}`}>{entry}</p>)}
            </section>
            <section className="panel chronicle">
              <h3>Recovered Books And Reports</h3>
              {game.state.library.length === 0 && <p>No books recovered yet.</p>}
              {game.state.library.map((entry) => (
                <article key={entry.id} className="archive-entry">
                  <strong>{entry.title}</strong>
                  <p>{entry.summary}</p>
                  <small>{entry.category.replace('_', ' ')} • {entry.rarity} • {entry.acquired_from}</small>
                  <p>{entry.body}</p>
                </article>
              ))}
            </section>
          </>
        )}

        {game.screen === 'memorial' && (
          <section className="panel memorial">
            <h3>Hall of the Fallen</h3>
            {game.state.memorial.length === 0 && <p>No fallen mercenaries yet.</p>}
            {game.state.memorial.map((m) => (
              <article key={m.id} className="engraved">
                <strong>{m.name}</strong>
                <p>{m.class} • Lv {m.level_at_death}</p>
                <p>{m.cause_of_death}</p>
                <small>{m.notable_events.join(' | ')}</small>
              </article>
            ))}
          </section>
        )}
      </main>
    </div>
  );
}
