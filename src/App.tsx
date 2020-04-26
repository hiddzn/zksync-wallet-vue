import React, { useEffect, useCallback, useState } from 'react';

import Footer from 'components/Footer/Footer';
import Header from 'components/Header/Header';
import Modal from 'components/Modal/Modal';

import { useRootData } from 'hooks/useRootData';
import useWalletInit from 'hooks/useWalletInit';

import { IAppProps } from 'types/Common';

import { RIGHT_NETWORK_ID, RIGHT_NETWORK_NAME } from 'constants/networks';
import { useWSHeartBeat } from 'hooks/useWSHeartbeat';
import { useLogout } from 'hooks/useLogout';
import { WalletType } from './constants/Wallets';
import { useCancelable } from './hooks/useCancelable';
import { useInterval } from './hooks/timers';

const App: React.FC<IAppProps> = ({ children }): JSX.Element => {
  const {
    error,
    isAccessModalOpen,
    provider,
    setAccessModal,
    setError,
    setWalletName,
    walletName,
    zkWallet,
    setZkBalances,
    setZkWallet,
    setHintModal,
  } = useRootData(
    ({ error, isAccessModalOpen, provider, walletName, zkWallet, ...s }) => ({
      ...s,
      error: error.get(),
      isAccessModalOpen: isAccessModalOpen.get(),
      provider: provider.get(),
      walletName: walletName.get(),
      zkWallet: zkWallet.get(),
    }),
  );

  useWSHeartBeat();
  const { createWallet } = useWalletInit();
  const providerNetwork = provider?.networkVersion;
  const cancelable = useCancelable();
  const [curAddress, setCurAddress] = useState<string>(
    provider?.selectedAddress,
  );

  useEffect(() => {
    if (provider && walletName) {
      setCurAddress(provider?.selectedAddress);
    }
    if (curAddress && walletName) {
      setHintModal('Connected! Make sign in the pop up');
    }
  }, [curAddress, provider, setHintModal, walletName]);

  useEffect(() => {
    if (
      (walletName === 'Metamask' &&
        curAddress &&
        !zkWallet &&
        provider.networkVersion === RIGHT_NETWORK_ID) ||
      (!zkWallet && walletName && walletName !== 'Metamask')
    ) {
      cancelable(createWallet());
    }
  }, [
    cancelable,
    createWallet,
    provider,
    setHintModal,
    walletName,
    zkWallet,
    providerNetwork,
    curAddress,
  ]);

  useInterval(() => {
    if (!curAddress && walletName && provider?.selectedAddress) {
      setCurAddress(provider?.selectedAddress);
    }
  }, 5000);

  useEffect(() => {
    if (provider && walletName === 'Metamask') {
      window['ethereum'].autoRefreshOnNetworkChange = false;

      const listener = () => {
        if (
          provider.networkVersion !== RIGHT_NETWORK_ID &&
          walletName === 'Metamask'
        ) {
          setError(`Wrong network, please switch to the ${RIGHT_NETWORK_NAME}`);
        } else {
          setError('');
        }
      };

      listener();
      provider.on('networkChanged', listener);
      return () => provider.off('networkChanged', listener);
    }
  }, [createWallet, provider, setError, walletName, zkWallet, cancelable]);

  const logout = useLogout();

  useEffect(() => {
    if (!!zkWallet) {
      setAccessModal(false);
    }
    if (!provider || walletName.toLowerCase() !== 'metamask') return;
    provider.on('accountsChanged', () => {
      if (
        zkWallet &&
        provider &&
        zkWallet?.address().toLowerCase() !==
          provider.selectedAddress.toLowerCase()
      ) {
        sessionStorage.setItem('walletName', walletName);
        const savedWalletName = sessionStorage.getItem(
          'walletName',
        ) as WalletType;
        if (savedWalletName) {
          setWalletName(savedWalletName);
        }
        setZkWallet(null);
        setZkBalances([]);
        setAccessModal(true);
      }
    });
  }, [
    logout,
    provider,
    setAccessModal,
    setWalletName,
    walletName,
    setZkBalances,
    setZkWallet,
    zkWallet,
  ]);

  return (
    <div className={`content-wrapper ${walletName ? '' : 'start-page'}`}>
      <Modal
        cancelAction={() => setError('')}
        visible={!!error}
        classSpecifier='error'
        background={true}
        centered
      >
        <p>{error}</p>
      </Modal>
      <Modal
        cancelAction={() => setAccessModal(false)}
        visible={
          isAccessModalOpen &&
          window.location.pathname.length > 1 &&
          provider &&
          provider.networkVersion === RIGHT_NETWORK_ID
        }
        classSpecifier='acc'
        background={true}
        centered
      >
        <p>{'Please make sign in the pop up'}</p>
      </Modal>
      {walletName && <Header />}
      <div className='content'>{children}</div>
      <Footer />
    </div>
  );
};

export default App;
