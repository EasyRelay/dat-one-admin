import type { ModalProps } from 'antd';

/**
 * Shared sizing for the form modals.
 *
 * Without it a modal taller than the window simply overflowed it: the plan
 * form ran ~90px past the bottom of a 950px viewport, taking Save and Cancel
 * with it, so the buttons could only be reached by scrolling the page behind
 * the dialog. `centered` plus a bounded, scrolling body keeps the header and
 * the footer on screen at any window height and lets only the fields move.
 *
 * The 200px allowance covers the header, the footer and the margin a centered
 * modal keeps above and below itself.
 */
export const formModalProps = {
  centered: true,
  styles: {
    body: {
      maxHeight: 'calc(100vh - 200px)',
      overflowY: 'auto',
      // Room for the scrollbar so it never sits on top of an input's border.
      paddingRight: 8,
    },
  },
} satisfies Pick<ModalProps, 'centered' | 'styles'>;
