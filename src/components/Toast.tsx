import { useEventSystem } from '@src/hooks/useEventSystem';
import { useEffect, useState } from 'react';

type ToastProps = {
  message: string;
  onClick?: () => void;
};

function Toast({ message, onClick }: ToastProps) {
  return (
    <div className="fixed w-full bottom-20 transition-all duration-300 flex justify-center">
      <div className='bg-orange-600 text-black px-4 py-2 rounded shadow-md max-w-[70vw] flex'>
        {message}
        {onClick && <div className='inline-block ml-5 cursor-pointer' onClick={onClick}>✕</div>}
      </div>
    </div>
  );
};

export function ToastManager() {
  const [toastProps, setToastProps] = useState<ToastProps>({
    message: '',
  });

  const { subscribe } = useEventSystem();

  useEffect(() => {
    const unsubscribeInfo = subscribe('errorToast', (eventMessage: string) => {
        setToastProps({
            message: eventMessage,
            onClick: () => setToastProps({
                message: ''
            })
        });
    });

    const unsubscribeError = subscribe('infoToast', (eventMessage: string) => {
        setToastProps({
            message: eventMessage,
        });
        setTimeout(() => setToastProps({
            message: ''
        }), 3000);
    });

    return () => {
        unsubscribeInfo();
        unsubscribeError();
    };
  }, [subscribe]);

  return (
    <>
      {toastProps.message && <Toast {...toastProps} />}
    </>
  );
};