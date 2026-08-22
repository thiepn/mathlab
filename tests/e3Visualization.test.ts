import { describe, expect, it } from 'vitest';
import { parseMath } from '../src/lib/math/parser';
import { resolveSemanticObject } from '../src/lib/math/semantic';
import { criticalMarkers, evaluateNumericPoint, projectPoint3, sampleContours, sampleGradientField, sampleImplicitCurve, sampleParametricCurve, sampleParametricSurface, samplePhasePortrait, samplePolarCurve, sampleScalarField, sampleSurface, sampleVectorField, vectorComponents } from '../src/lib/math/visualization2';
import { visualizationModesFor } from '../src/app/visualizationModes';

function object(source:string){const parsed=parseMath(source);expect(parsed.diagnostics.filter((item)=>item.severity==='error')).toHaveLength(0);const resolved=resolveSemanticObject(parsed,[],[]);expect(resolved.object).not.toBeNull();return resolved.object!;}
const view={xMin:-2,xMax:2,yMin:-2,yMax:2};

describe('E3 Visualization 2.0',()=>{
  it('evaluates multivariable ASTs against named coordinates',()=>{
    const ast=object('f(x,y) := x^2 + 2*y').valueAst;
    expect(evaluateNumericPoint(ast,{x:3,y:4})).toBe(17);
  });

  it('samples a closed parametric circle',()=>{
    const source=object('C(t) := [cos(t), sin(t)]');
    const lines=sampleParametricCurve(source.valueAst,'t',0,2*Math.PI,361);
    expect(lines).toHaveLength(1);expect(lines[0].points.length).toBeGreaterThan(300);
    const first=lines[0].points[0],last=lines[0].points.at(-1)!;
    expect(first.x).toBeCloseTo(1,8);expect(first.y).toBeCloseTo(0,8);expect(last.x).toBeCloseTo(first.x,6);expect(last.y).toBeCloseTo(first.y,6);
  });

  it('samples a polar unit circle',()=>{
    const source=object('r(theta) := 1');
    const lines=samplePolarCurve(source.valueAst,'theta',0,2*Math.PI,361);
    expect(lines).toHaveLength(1);expect(lines[0].points[90].x**2+lines[0].points[90].y**2).toBeCloseTo(1,6);
  });

  it('traces a two-variable implicit circle with marching squares',()=>{
    const source=object('x^2 + y^2 = 1');
    const segments=sampleImplicitCurve(source.valueAst,['x','y'],view,64);
    expect(segments.length).toBeGreaterThan(80);
    expect(segments.some((segment)=>Math.abs(segment.a.x-1)<.08||Math.abs(segment.a.x+1)<.08)).toBe(true);
  });

  it('builds multiple contour levels for a scalar field',()=>{
    const source=object('f(x,y) := x^2 + y^2');
    const contours=sampleContours(source.valueAst,['x','y'],view,[.5,1,2],48);
    expect(contours).toHaveLength(3);expect(contours.every((level)=>level.segments.length>0)).toBe(true);
  });

  it('samples scalar fields with a finite normalized value range',()=>{
    const source=object('f(x,y) := x-y');const field=sampleScalarField(source.valueAst,['x','y'],view,20,16);
    expect(field.cells).toHaveLength(320);expect(field.min).toBeLessThan(field.max);expect(field.cells.every((cell)=>cell.normalized>=0&&cell.normalized<=1)).toBe(true);
  });

  it('samples a normalized 2D vector field while retaining original magnitude',()=>{
    const source=object('F(x,y) := [-y,x]');const field=sampleVectorField(source.valueAst,['x','y'],view,11);
    expect(field.arrows.length).toBeGreaterThan(80);expect(field.maxMagnitude).toBeGreaterThan(2);
    expect(field.arrows.every((arrow)=>Number.isFinite(arrow.dx)&&Number.isFinite(arrow.dy)&&arrow.magnitude>0)).toBe(true);
  });

  it('derives and samples the exact E1 gradient field',()=>{
    const source=object('f(x,y) := x^2 + y^2');const field=sampleGradientField(source.valueAst,['x','y'],view,9);
    const right=field.arrows.filter((arrow)=>arrow.x>1&&Math.abs(arrow.y)<.3);
    expect(right.length).toBeGreaterThan(0);expect(right.every((arrow)=>arrow.dx>0)).toBe(true);
  });

  it('creates deterministic phase trajectories in a rotational field',()=>{
    const source=object('F(x,y) := [-y,x]');const portrait=samplePhasePortrait(source.valueAst,['x','y'],view,9,3);
    expect(portrait.field.arrows.length).toBeGreaterThan(30);expect(portrait.trajectories.length).toBeGreaterThan(3);expect(portrait.trajectories.some((line)=>line.points.length>20)).toBe(true);
  });

  it('reuses E1 exact critical-point analysis for overlays',()=>{
    const source=object('f(x,y) := x^2 + y^2 - 2*x + 4*y');const markers=criticalMarkers(source.valueAst,['x','y']);
    expect(markers).toHaveLength(1);expect(markers[0].x).toBeCloseTo(1);expect(markers[0].y).toBeCloseTo(-2);expect(markers[0].classification).toBe('local minimum');
  });

  it('samples a graph surface and preserves critical overlays',()=>{
    const source=object('f(x,y) := x^2 + y^2');const mesh=sampleSurface(source.valueAst,['x','y'],view,17);
    expect(mesh.rows).toHaveLength(17);expect(mesh.rows[0]).toHaveLength(17);expect(mesh.bounds3.zMax).toBeGreaterThan(mesh.bounds3.zMin);expect(mesh.criticalPoints[0]?.classification).toBe('local minimum');
  });

  it('samples a two-parameter three-component surface',()=>{
    const source=object('S(u,v) := [u,v,u*v]');const mesh=sampleParametricSurface(source.valueAst,['u','v'],[-1,1],[-1,1],13);
    expect(mesh.rows).toHaveLength(13);expect(mesh.rows[0]).toHaveLength(13);expect(mesh.bounds3.zMin).toBeCloseTo(-1);expect(mesh.bounds3.zMax).toBeCloseTo(1);
  });

  it('projects 3D points deterministically for the SVG surface camera',()=>{
    const bounds={xMin:-1,xMax:1,yMin:-1,yMax:1,zMin:-1,zMax:1};const a=projectPoint3({x:1,y:0,z:0},bounds,{azimuth:40,elevation:25,zoom:1});const b=projectPoint3({x:1,y:0,z:0},bounds,{azimuth:40,elevation:25,zoom:1});
    expect(a).toEqual(b);expect(Number.isFinite(a.x)&&Number.isFinite(a.y)&&Number.isFinite(a.depth)).toBe(true);
  });

  it('classifies semantic objects into the correct E3 renderers',()=>{
    expect(visualizationModesFor(object('f(x) := sin(x)'))).toEqual(expect.arrayContaining(['cartesian','polar']));
    expect(visualizationModesFor(object('C(t) := [cos(t),sin(t)]'))).toEqual(['parametric']);
    expect(visualizationModesFor(object('x^2+y^2=1'))).toEqual(['implicit']);
    expect(visualizationModesFor(object('f(x,y) := x^2+y^2'))).toEqual(expect.arrayContaining(['contour','scalar-field','gradient-field','surface-3d']));
    expect(visualizationModesFor(object('F(x,y) := [-y,x]'))).toEqual(['vector-field','phase-portrait']);
    expect(visualizationModesFor(object('S(u,v) := [u,v,u*v]'))).toEqual(['parametric-surface-3d']);
  });

  it('rejects malformed vector dimensions at the sampling boundary',()=>{
    expect(()=>vectorComponents(object('F(t) := [t,t^2,t^3]').valueAst,2)).toThrow(/2-component/);
  });
});
