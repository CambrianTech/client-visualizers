import { PropsWithChildren } from 'react';
import ReactModal from 'react-modal';
import styled from 'styled-components';

type Props = PropsWithChildren<{
    onClose(): void;
    isOpen?: boolean;
}>;

const CloseButton = styled.button`
  position: absolute;
  top: 1.25rem;
  right: 1.25rem;
  height: 2rem;
  width: 2rem;
  border-radius: 100%;
  background: white;
  border: 2px solid lightgray;
  display: flex;
  justify-content: center;
  align-items: center;
  outline: none !important;
  color: darkgray;
  :hover,
  :focus,
  :focus-visible {
    border-color: #fff;
    color: #fff;
  }
`;

export function Modal({ onClose, isOpen = true, children}: Props) {
    return (
        <ReactModal
            isOpen={isOpen}
            onRequestClose={onClose}
            style={{
                overlay: {
                    background: 'rgba(0, 0, 0, 0.5)',
                    zIndex: 1,
                },
                content:
                    {
                        background: '#fff',
                        padding: 16,
                        boxShadow: '0px 10px 20px 9px rgba(0, 0, 0, 0.1)',
                        maxWidth: '1000px',
                        margin: '0 auto',
                        overflowY: 'auto',
                        height: '80%',
                        inset: '90px 40px auto 40px',
                    },
            }}
        >
            <CloseButton onClick={onClose} aria-label="Close and cancel modal">
                {'\u2715'}
            </CloseButton>
            {children}
        </ReactModal>
    );
}
