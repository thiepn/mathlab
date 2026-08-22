import type { HTMLAttributes, Key } from 'react';

type MathMLIntrinsicProps = HTMLAttributes<HTMLElement> & {
  key?: Key;
  mathvariant?: string;
  display?: 'block' | 'inline' | string;
  stretchy?: boolean | string;
  linethickness?: string;
};

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      math: MathMLIntrinsicProps;
      mi: MathMLIntrinsicProps;
      mn: MathMLIntrinsicProps;
      mo: MathMLIntrinsicProps;
      mrow: MathMLIntrinsicProps;
      mfrac: MathMLIntrinsicProps;
      msup: MathMLIntrinsicProps;
      msub: MathMLIntrinsicProps;
      msubsup: MathMLIntrinsicProps;
      msqrt: MathMLIntrinsicProps;
      mtable: MathMLIntrinsicProps;
      mtr: MathMLIntrinsicProps;
      mtd: MathMLIntrinsicProps;
    }
  }
}
