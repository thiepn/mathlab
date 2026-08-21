import type { HTMLAttributes } from 'react';

type MathMLIntrinsicProps = HTMLAttributes<HTMLElement> & {
  mathvariant?: string;
};

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      mi: MathMLIntrinsicProps;
      mn: MathMLIntrinsicProps;
      mo: MathMLIntrinsicProps;
      mrow: MathMLIntrinsicProps;
      mfrac: MathMLIntrinsicProps;
      msup: MathMLIntrinsicProps;
      msqrt: MathMLIntrinsicProps;
      mtable: MathMLIntrinsicProps;
      mtr: MathMLIntrinsicProps;
      mtd: MathMLIntrinsicProps;
    }
  }
}
