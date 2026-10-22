import { describe, expect, it } from 'vitest';
import { parseCommand } from '../src/commands/parseCommand';
import { estimateEmissions } from '../src/config/emissions';

describe('command interpretation', () => {
  it.each([
    [' Please zoom in. ', { type: 'ZOOM_IN' }],
    ['ZOOM OUT!', { type: 'ZOOM_OUT' }],
    ['Zoom to São Paulo', { type: 'ZOOM_TO_LOCATION', location: 'São Paulo' }],
    ['zoom in to ahmedabad', { type: 'ZOOM_TO_LOCATION', location: 'ahmedabad' }],
    ['Zoom into Ahmedabad', { type: 'ZOOM_TO_LOCATION', location: 'Ahmedabad' }],
    ['Zoom to Ahmedabad', { type: 'ZOOM_TO_LOCATION', location: 'Ahmedabad' }],
    ['Go to Ahmedabad', { type: 'PAN_TO_LOCATION', location: 'Ahmedabad' }],
    ['Go to Pune', { type: 'PAN_TO_LOCATION', location: 'Pune' }],
    ['Find Mumbai', { type: 'SEARCH_LOCATION', location: 'Mumbai' }],
    ['Add marker at 19.076, 72.8777', { type: 'ADD_MARKER', location: '19.076, 72.8777' }],
    ['Remove marker', { type: 'REMOVE_MARKER' }],
    ['Remove marker at Pune', { type: 'REMOVE_MARKER', location: 'Pune' }],
    ['Clear markers', { type: 'CLEAR_MARKERS' }],
    ['Show road layer', { type: 'SHOW_LAYER', layer: 'street' }],
    ['Show topographic map', { type: 'SHOW_LAYER', layer: 'topographic' }],
    ['Hide topographic map', { type: 'HIDE_LAYER', layer: 'topographic' }],
    ['Find cafes near Marine Drive.', { type: 'FIND_NEARBY', category: 'cafe', location: 'Marine Drive', radiusM: 3000 }],
    ['Show hospitals near Andheri', { type: 'FIND_NEARBY', category: 'hospital', location: 'Andheri', radiusM: 3000 }],
    ['Find parks within 3 km of Powai', { type: 'FIND_NEARBY', category: 'park', location: 'Powai', radiusM: 3000 }],
    ['Find hotels within 500 m of Jaipur', { type: 'FIND_NEARBY', category: 'hotel', location: 'Jaipur', radiusM: 500 }],
    ['Plan route from Gateway of India to Marine Drive', { type: 'PLAN_ROUTE', origin: 'Gateway of India', destination: 'Marine Drive' }],
    ['Clear route', { type: 'CLEAR_ROUTE' }],
    ['Reset map', { type: 'RESET_MAP' }],
  ])('interprets %s', (input, expected) => expect(parseCommand(input)).toEqual(expected));

  it.each(['', 'zoom to', 'zoom in to', 'zoom into', 'add marker at', 'fly to the moon', 'find parks within -2 km of Pune', 'find parks within 99 km of Pune', 'Plan route from Mumbai to Pune by walking', 'show satellite map', 'show highways'])('rejects unsupported or incomplete input: %s', input => {
    const command = parseCommand(input);
    expect(command.type).toBe('UNKNOWN_COMMAND');
    if (command.type === 'UNKNOWN_COMMAND') expect(command.reason.length).toBeGreaterThan(10);
  });
  it.each(['constructor', '__proto__', 'toString', 'Show constructor', 'Hide __proto__', 'Find constructor near Mumbai'])('rejects object prototype property names safely: %s', input => {
    const result = parseCommand(input);
    expect(result.type).toBe('UNKNOWN_COMMAND');
  });
});

describe('transparent emissions arithmetic', () => {
  it('uses supplied distance and configurable factor', () => expect(estimateEmissions(10, 0.2)).toBe(2));
  it('allows zero operational emissions and zero distance', () => {
    expect(estimateEmissions(10, 0)).toBe(0);
    expect(estimateEmissions(0, 0.2)).toBe(0);
  });
  it.each([[-1, 0.2], [NaN, 0.2], [Infinity, 0.2], [10, -1]])('rejects invalid distance/factors', (distance, factor) => expect(() => estimateEmissions(distance, factor)).toThrow());
});
