declare module '@skip-go/widget' {
  import * as React from 'react';

  export interface WidgetProps extends Record<string, any> {}

  export const Widget: React.FC<WidgetProps>;
}
