/* eslint-disable vtex/prefer-early-return */
import React, { useState, useEffect } from 'react'
import type { WrappedComponentProps, MessageDescriptor } from 'react-intl'
import { injectIntl, FormattedMessage } from 'react-intl'
import { FormattedCurrency } from 'vtex.format-currency'
import { Table, Button, PageHeader, Spinner } from 'vtex.styleguide'
import { useCssHandles } from 'vtex.css-handles'
import { compose, graphql, useLazyQuery } from 'react-apollo'
import PropTypes from 'prop-types'
import { useRuntime } from 'vtex.render-runtime'

import { getSession } from './modules/session'
import getCarts from './queries/getCarts.gql'
import getOrderForm from './queries/orderForm.gql'
import storageFactory from './utils/storage'

const localStore = storageFactory(() => localStorage)

const useSessionResponse = () => {
  const [session, setSession] = useState()
  const sessionPromise = getSession()

  useEffect(() => {
    if (!sessionPromise) {
      return
    }

    sessionPromise.then((sessionResponse) => {
      const { response } = sessionResponse

      setSession(response)
    })
  }, [sessionPromise])

  return session
}

const useIsTelevendas = () => {
  const [isTelevendas, setIsTelevendas] = useState(false);
  const [isCheckingTelevendas, setIsCheckingTelevendas] = useState(true);

  useEffect(() => {
    const checkTelevendas = async () => {
      try {
        const response = await fetch(`/api/checkout/pub/orderForm`);
        const data = await response.json();

        // Verifica o userType ou outra característica específica do usuário
        const isTelevendasUser = data.userType === 'callCenterOperator';

        setIsTelevendas(isTelevendasUser);
      } catch (error) {
        console.log('Error fetching orderForm:', error);
      } finally {
        setIsCheckingTelevendas(false);
      }
    };

    checkTelevendas();
  }, []);

  return { isTelevendas, isCheckingTelevendas };
};

let isAuthenticated =
  JSON.parse(String(localStore.getItem('orderquote_isAuthenticated'))) ?? false

const QuoteList: StorefrontFunctionComponent<WrappedComponentProps & any> = ({
  intl,
}: any) => {
  const [getQuoteList, { data, loading, called }] = useLazyQuery(getCarts, {
    fetchPolicy: 'no-cache',
    partialRefetch: true,
  })

  const { navigate } = useRuntime()
  const sessionResponse: any = useSessionResponse()

  const { isTelevendas, isCheckingTelevendas } = useIsTelevendas();

  console.log('@@isTelevendas', isTelevendas);

  const translateMessage = (message: MessageDescriptor) => {
    return intl.formatMessage(message)
  }

  const fetch = () => {
    getQuoteList({
      variables: {
        email: sessionResponse?.namespaces?.profile?.email?.value ?? null,
      },
    })
  }

  if (sessionResponse) {
    isAuthenticated =
      sessionResponse?.namespaces?.profile?.isAuthenticated?.value === 'true'

    localStore.setItem(
      'orderquote_isAuthenticated',
      JSON.stringify(isAuthenticated)
    )

    if (!called) {
      fetch()
    }
  }

  const defaultSchema = {
    properties: {
      cartName: {
        title: translateMessage({
          id: 'store/orderquote.list.label.name',
        }),
        width: 300,
      },
      discounts: {
        title: translateMessage({
          id: 'store/orderquote.list.label.discounts',
        }),
        minWidth: 100,
        headerRight: true,
        // eslint-disable-next-line react/display-name
        cellRenderer: ({ cellData }: any) => {
          const discount = cellData === 0 ? cellData : cellData / 100

          return (
            <span className="tr w-100">
              <FormattedCurrency value={discount} />
            </span>
          )
        },
      },
      shipping: {
        title: translateMessage({
          id: 'store/orderquote.list.label.shipping',
        }),
        minWidth: 100,
        headerRight: true,
        // eslint-disable-next-line react/display-name
        cellRenderer: ({ cellData }: any) => {
          const newCellData = cellData === 0 ? cellData : cellData / 100

          return (
            <span className="tr w-100">
              <FormattedCurrency
                value={newCellData === 0 ? newCellData : newCellData / 100}
              />
            </span>
          )
        },
      },
      total: {
        title: translateMessage({
          id: 'store/orderquote.list.label.total',
        }),
        minWidth: 100,
        headerRight: true,
        // eslint-disable-next-line react/display-name
        cellRenderer: ({ cellData }: any) => {
          return (
            <span className="tr w-100">
              <FormattedCurrency
                value={cellData === 0 ? cellData : cellData}
              />
            </span>
          )
        },
      },
      creationDate: {
        title: translateMessage({
          id: 'store/orderquote.list.label.created',
        }),
        headerRight: true,
        // eslint-disable-next-line react/display-name
        cellRenderer: ({ cellData }: any) => {
          return (
            <span className="tr w-100">
              {intl.formatDate(cellData, {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
            </span>
          )
        },
      },
    },
  }

  const CSS_HANDLES = [
    'containerList',
    'refreshButton',
    'refreshLoading',
    'listContainer',
    'notAuthenticatedMessage',
    'spinnerContainer',
  ] as const

  const handles = useCssHandles(CSS_HANDLES)

  if (isCheckingTelevendas || loading) {
    return (
      <div className={`${handles.spinnerContainer} flex justify-center items-center`}>
        <Spinner />
      </div>
    )
  }

  if (!isTelevendas) {
    return (
      <div
        className="flex justify-center items-center"
        style={{ height: '300px' }}
      >
        <p
          style={{
            fontSize: '1.5rem',
            fontWeight: 'bold',
            textAlign: 'center',
          }}
        >
          Apenas um vendedor pode acessar esta sessão.
        </p>
      </div>
    )

  }

  return (
    <div className={`${handles.containerList} mw9 center`}>
      <PageHeader
        title={translateMessage({
          id: 'store/orderquote.list.title',
        })}
        className="text-center"
        containerClassName="w-100"
      />
      <div className="flex flex-row mv3 justify-center">
        <span
          className={`mr3 ${handles.refreshButton} ${loading ? 'refreshLoading' : ''
            }`}
        >
          <Button
            size="small"
            variation="tertiary"
            disabled={loading}
            onClick={() => {
              fetch()
            }}
          >
            <FormattedMessage id="store/orderquote.button.refresh" />
          </Button>
        </span>

        <Button
          variation="primary"
          onClick={() => {
            navigate({
              page: `store.create`,
            })
          }}
        >
          <FormattedMessage id="store/orderquote.button.new" />
        </Button>
      </div>

      <div className="flex flex-row ph5 ph7-ns">
        <div className="mb5 flex flex-column w-100">
          {!isAuthenticated && (
            <div className={`mb5 ${handles.notAuthenticatedMessage}`}>
              <FormattedMessage id="store/orderquote.error.notAuthenticated" />
            </div>
          )}
          {isAuthenticated && data && (
            <div className={`mb5 ${handles.listContainer}`}>
              <Table
                fullWidth
                schema={defaultSchema}
                items={data.getCarts}
                density="high"
                loading={!called && loading}
                onRowClick={({ rowData }: any) => {
                  navigate({
                    to: `/orderquote/view/${rowData.id}`,
                  })
                }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

QuoteList.propTypes = {
  data: PropTypes.object,
}

export default injectIntl(
  compose(
    graphql(getOrderForm, {
      options: { ssr: false },
    })
  )(QuoteList)
)
