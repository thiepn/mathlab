import type { ToolCatalogItem } from './toolCatalog';

const optimization = 'Optimization & OR' as const;
const statistics = 'Probability & Statistics' as const;
const numerical = 'Numerical Math & ODEs' as const;

export const P7_TOOL_CATALOG: ToolCatalogItem[] = [
  {
    id:'simplex-linear-program',
    operation:'simplex-linear-program',
    label:'Canonical simplex linear program',
    category:optimization,
    phase:'P7',
    objectKinds:['matrix'],
    description:'Solve a canonical n-variable linear program max/min c·x subject to Ax≤b, b≥0 and x≥0 using deterministic primal simplex with slack and binding-constraint diagnostics.',
    example:'[[1,1,4],[1,0,2],[0,1,3]]',
    aliases:['simplex','linear programming','LP','operations research','shadow constraints'],
  },
  {
    id:'assignment-problem',
    operation:'assignment-problem',
    label:'Optimal assignment',
    category:optimization,
    phase:'P7',
    objectKinds:['matrix'],
    description:'Solve a square minimum-cost or maximum-profit one-to-one assignment problem with the Hungarian algorithm.',
    example:'[[9,2,7],[6,4,3],[5,8,1]]',
    aliases:['Hungarian algorithm','matching costs','assignment optimization','operations research'],
  },
  {
    id:'transportation-problem',
    operation:'transportation-problem',
    label:'Balanced transportation problem',
    category:optimization,
    phase:'P7',
    objectKinds:['matrix'],
    description:'Minimize shipping cost over a balanced supplier-demand network with configured supply and demand vectors using deterministic min-cost flow.',
    example:'[[2,3,1],[5,4,8]]',
    aliases:['transportation model','shipping','min cost flow','operations research'],
  },
  {
    id:'time-series-profile',
    operation:'time-series-profile',
    label:'Time-series trend & autocorrelation',
    category:statistics,
    phase:'P7',
    objectKinds:['vector','dataset'],
    description:'Profile an ordered numeric series with linear time trend, R²/RMSE, next-period trend extrapolation and bounded autocorrelation lags.',
    example:'data(100,103,102,108,112,115,117,121)',
    aliases:['time series','ACF','autocorrelation','trend','economic data'],
  },
  {
    id:'exponential-smoothing',
    operation:'exponential-smoothing',
    label:'Simple exponential smoothing',
    category:statistics,
    phase:'P7',
    objectKinds:['vector','dataset'],
    description:'Compute deterministic simple exponential smoothing, one-step fit error and a configurable level forecast horizon.',
    example:'data(100,103,102,108,112,115,117,121)',
    aliases:['SES','forecasting','exponential smoothing','time series forecast'],
  },
  {
    id:'polynomial-least-squares',
    operation:'polynomial-least-squares',
    label:'Polynomial least-squares fit',
    category:numerical,
    phase:'P7',
    objectKinds:['matrix'],
    description:'Fit a bounded-degree polynomial to paired observations using Householder QR, reporting coefficients, R², RMSE and optional prediction.',
    example:'[[0,1],[1,2.1],[2,4.2],[3,8.8],[4,15.9]]',
    aliases:['polynomial regression','curve fitting','least squares','QR fit','numerical modeling'],
  },
];
