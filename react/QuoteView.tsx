/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { useState, useContext, useEffect } from 'react'
import {
  // Button,
  Table,
  ToastContext,
  Totalizer,
  ModalDialog,
  PageHeader
} from 'vtex.styleguide'
import { useCssHandles } from 'vtex.css-handles'
import { useQuery, compose, graphql } from 'react-apollo'
import { FormattedCurrency } from 'vtex.format-currency'
import { useRuntime } from 'vtex.render-runtime'
import OrderFormQuery from 'vtex.checkout-resources/QueryOrderForm'
import type { OrderForm } from 'vtex.checkout-graphql'
import type { MessageDescriptor, WrappedComponentProps } from 'react-intl'
import { injectIntl, FormattedMessage } from 'react-intl'
import PropTypes from 'prop-types'

import PrintButton from './PrintButton'
import getCart from './graphql/getCart.graphql'
import getSetupConfig from './graphql/getSetupConfig.graphql'
import removeCart from './graphql/removeCart.graphql'
import useCart from './graphql/useCartMutation.graphql'

import './print.css'

let initialLoad = true

const DEFAULT_ADMIN_SETUP = {
  cartLifeSpan: 7,
  storeLogoUrl: '',
}

const CSS_HANDLES = [
  'containerView',
  'buttonDelete',
  'buttonPrint',
  'buttonContainerView',
  'buttonUse',
  'printingArea',
  'containerFields',
  'field',
  'listContainer',
  'totalizerContainer',
  'logo',
  'itemNameContainer',
  'itemName',
  'itemSkuName',
] as const

const QuoteView: StorefrontFunctionComponent<WrappedComponentProps & any> = ({
  // GetCart,
  GetSetupConfig,
  // UseCart,
  RemoveCart,
  intl,
}: any) => {
  const { navigate } = useRuntime()


  const translateMessage = (message: MessageDescriptor) =>
    intl.formatMessage(message)

  const {
    // loading: loadingOrderForm,
    // data: orderFormData,
    error: orderFormError,
  } = useQuery<{
    orderForm: OrderForm
  }>(OrderFormQuery, {
    ssr: false,
  })

  const [_state, setState] = useState<any>({
    savingQuote: false,
    removing: false,
    usingQuote: false,
    isModalOpen: false,
    expires: null,
    logo: null,
    quoteList: [],
    summary: [
      {
        label: translateMessage({
          id: 'store/orderquote.summary.subtotal',
        }),
        value: 0,
        isLoading: true,
      },
      {
        label: translateMessage({
          id: 'store/orderquote.summary.shipping',
        }),
        value: 0,
        isLoading: true,
      },

      {
        label: translateMessage({
          id: 'store/orderquote.summary.discounts',
        }),
        value: 0,
        isLoading: true,
      },
      {
        label: translateMessage({
          id: 'store/orderquote.summary.taxes',
        }),
        value: 0,
        isLoading: true,
      },
      {
        label: translateMessage({
          id: 'store/orderquote.summary.total',
        }),
        value: 0,
        isLoading: true,
      },
    ],
    loading: true,
  })

  const {
    route: { params },
  } = useRuntime()

  const handles = useCssHandles(CSS_HANDLES)

  const {
    savingQuote,
    // usingQuote,
    isModalOpen,
    removing,
    quoteList,
    loading,
    summary,
    expires,
    logo,
  } = _state

  const handleModalToggle = () => {
    setState({ ..._state, isModalOpen: !isModalOpen })
  }

  const { showToast } = useContext(ToastContext)

  const toastMessage = (messsageKey: string) => {
    const message = translateMessage({
      id: messsageKey,
    })

    const action = undefined

    showToast({ message, action })
  }

  if (orderFormError) {
    toastMessage('store/orderquote.view.error.orderForm')
  }

  const handleRemoveCart = () => {
    setState({
      ..._state,
      removing: true,
      isModalOpen: false,
    })
    RemoveCart({
      variables: {
        id: params.id,
      },
    }).then(() => {
      navigate({
        page: 'store.orderquote',
      })
    })
  }

  // const parseCustomData = (cd: any) => {
  //   if (cd?.customApps) {
  //     return {
  //       customApps: cd.customApps.map(({ id, major, fields }: any) => {
  //         return {
  //           id,
  //           major,
  //           fields: JSON.parse(fields),
  //         }
  //       }),
  //     }
  //   }

  //   return null
  // }

  // const handleUseCart = () => {
  //   setState({
  //     ..._state,
  //     usingQuote: true,
  //   })

  //   const variables = {
  //     orderFormId: orderFormData?.orderForm.id,
  //     userType: orderFormData?.orderForm.userType,
  //     customData: parseCustomData(quoteList.customData),
  //     items: quoteList.items.map(
  //       ({ id, quantity, sellingPrice, seller }: any) => ({
  //         id,
  //         quantity,
  //         sellingPrice,
  //         seller,
  //       })
  //     ),
  //   }

  //   UseCart({
  //     variables,
  //   }).then(() => {
  //     toastMessage('store/orderquote.view.success')
  //     window.location.replace('/checkout/#/cart')
  //   })
  // }

  if (initialLoad || quoteList.length === 0) {
    initialLoad = false
  }

  const defaultSchema = {
    properties: {
      refId: {
        title: translateMessage({
          id: 'store/orderquote.cartList.label.sku',
        }),
        width: 150,
      },
      skuName: {
        title: translateMessage({
          id: 'store/orderquote.cartList.label.itemName',
        }),
        // eslint-disable-next-line react/display-name
        cellRenderer: ({ rowData }: any) => {
          return rowData.skuName !== rowData.name ? (
            <div className={handles.itemNameContainer}>
              <span className={handles.itemName}>{rowData.name}</span>
              <br />
              <span className={`t-mini ${handles.itemSkuName}`}>
                {rowData.skuName}
              </span>
            </div>
          ) : (
            rowData.skuName
          )
        },
        minWidth: 100,
      },
      sellingPrice: {
        title: translateMessage({
          id: 'store/orderquote.cartList.label.price',
        }),
        headerRight: true,
        // eslint-disable-next-line react/display-name
        cellRenderer: ({ cellData }: any) => {
          return (
            <span className="tr w-100">
              <FormattedCurrency
                value={cellData > 0 ? cellData / 100 : cellData}
              />
            </span>
          )
        },
        width: 200,
      },
      quantity: {
        title: translateMessage({
          id: 'store/orderquote.cartList.label.quantity',
        }),
        width: 100,
      },
      id: {
        title: translateMessage({
          id: 'store/orderquote.cartList.label.total',
        }),
        headerRight: true,
        // eslint-disable-next-line react/display-name
        cellRenderer: ({ rowData }: any) => {
          const itemTotal = rowData.sellingPrice * rowData.quantity

          return (
            <span className="tr w-100">
              <FormattedCurrency
                value={itemTotal > 0 ? itemTotal / 100 : itemTotal}
              />
            </span>
          )
        },
        width: 200,
      },
    },
  }

  const { data: queryView, loading: loadingQuote } = useQuery(getCart, {
    variables: { id: params.id },
    ssr: false,
  })

  const formatDate = (date: string) => {
    const tempDate = new Date(date)

    return intl.formatDate(tempDate, {
      day: 'numeric',
      month: 'numeric',
      year: 'numeric',
    })
  }

  useEffect(() => {
    if (!loadingQuote && queryView && queryView.getCart) {
      const res = { data: { getCart: queryView.getCart } } // Adapte de acordo com o que sua lógica espera


      if (res?.data?.getCart) {
        console.log('@@Resposta do GetCart:', res.data.getCart)
        // eslint-disable-next-line prefer-destructuring
        const { subtotal, discounts, total, shipping, taxes, creationDate } =
          res.data.getCart[0]

        const exp = new Date(creationDate)
        const { cartLifeSpan, storeLogoUrl } =
          GetSetupConfig?.getSetupConfig?.adminSetup || DEFAULT_ADMIN_SETUP

        // eslint-disable-next-line radix
        exp.setDate(exp.getDate() + parseInt(cartLifeSpan))

        const newSubtotal = subtotal === 0 ? subtotal : subtotal / 100
        const newTaxes = taxes === 0 ? taxes : taxes / 100
        const newShipping = shipping === 0 ? shipping : shipping / 100

        setState({
          ..._state,
          expires: exp,
          logo: storeLogoUrl,
          quoteList: res.data.getCart[0],
          summary: [
            {
              label: translateMessage({
                id: 'store/orderquote.summary.subtotal',
              }),
              value: (
                <FormattedCurrency
                  value={newSubtotal === 0 ? newSubtotal : newSubtotal / 100}
                />
              ),
              isLoading: false,
            },
            {
              label: translateMessage({
                id: 'store/orderquote.summary.shipping',
              }),
              value: (
                <FormattedCurrency
                  value={newShipping === 0 ? newShipping : newShipping / 100}
                />
              ),
              isLoading: false,
            },
            {
              label: translateMessage({
                id: 'store/orderquote.summary.discounts',
              }),
              value: (
                <FormattedCurrency
                  value={discounts === 0 ? discounts : discounts / 100}
                />
              ),
              isLoading: false,
            },
            {
              label: translateMessage({
                id: 'store/orderquote.summary.taxes',
              }),
              value: (
                <FormattedCurrency
                  value={taxes === 0 ? taxes : newTaxes / 100}
                />
              ),
              isLoading: false,
            },
            {
              label: translateMessage({
                id: 'store/orderquote.summary.total',
              }),
              value: (
                <FormattedCurrency value={total === 0 ? total : total} />
              ),
              isLoading: false,
            },
          ],
          loading: false,
        })
      } else {
        toastMessage('store/orderquote.list.loadingError')
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadingQuote, queryView])

  return (
    <div className={`${handles.containerView}  mw9 center`}>
      <div className="noPrinting">
        <PageHeader
          title={translateMessage({
            id: 'store/orderquote.view.title',
          })}
          linkLabel={translateMessage({
            id: 'store/orderquote.button.back',
          })}
          onLinkClick={() => {
            navigate({
              to: '/orderquote',
            })
          }}
        >
          <div className="flex flex-row noPrinting">
            <div
              className={`${handles.buttonContainerView} mb5 flex flex-column items-end w-100 pt6`}
            >
              <div className="flex">
                {/* <div className={`mr5 ${handles.buttonDelete}`}>
                  <Button
                    variation="danger-tertiary"
                    isLoading={removing}
                    disabled={loading || savingQuote}
                    onClick={() => {
                      handleModalToggle()
                    }}
                  >
                    <FormattedMessage id="store/orderquote.button.delete" />
                  </Button>
                </div> */}
                <div className={`mr5 ${handles.buttonPrint}`}>
                  <PrintButton
                    isLoading={savingQuote}
                    disabled={loading || savingQuote || removing}
                  />
                </div>
                {/* <div className={`${handles.buttonUse}`}>
                  <Button
                    variation="primary"
                    isLoading={loadingOrderForm || usingQuote}
                    disabled={loading || orderFormError || removing}
                    onClick={() => {
                      handleUseCart()
                    }}
                  >
                    <FormattedMessage id="store/orderquote.button.use" />
                  </Button>
                </div> */}
              </div>
            </div>
          </div>
        </PageHeader>
      </div>
      <div className={`ph5 ph7-ns printing-area ${handles.printingArea}`}>
        {!loading && (
          <div className="flex flex-row">
            <div
              className={`flex flex-column w-100 ${handles.containerFields}`}
            >
              {!!logo && logo !== '/' && (
                <div className="mb5">
                  <img
                    src={logo}
                    alt={quoteList.cartName}
                    className={`${handles.logo}`}
                    height="50"
                  />
                </div>
              )}
              <div className={`mb2 ${handles.field}`}>
                <span className="b">
                  <FormattedMessage id="store/orderquote.view.label.cartName" />
                </span>
                : {quoteList.cartName}
              </div>
              {quoteList.description ? (
                <div className={`mb2 ${handles.field}`}>
                  <span className="b">
                    <FormattedMessage id="store/orderquote.view.label.description" />
                  </span>
                  : {quoteList.description}
                </div>
              ) : null}
              <div className={`mb2 ${handles.field}`}>
                <span className="b">
                  <FormattedMessage id="store/orderquote.view.label.creationDate" />
                </span>
                : {formatDate(quoteList.creationDate)}
              </div>
              <div className={`mb2 ${handles.field}`}>
                <span className="b">
                  <FormattedMessage id="store/orderquote.view.label.expirationDate" />
                </span>
                : {formatDate(expires)}
              </div>
              {!!quoteList.address && (
                <div>
                  <div className="mb2 mt5 b">
                    <FormattedMessage id="store/orderquote.view.label.address" />
                  </div>
                  <div className={`${quoteList.address ? '' : 'dn'}`}>
                    <div className={`mb2 ${handles.field}`}>
                      <span className="b">
                        <FormattedMessage id="store/orderquote.view.label.street" />
                      </span>
                      : {quoteList?.address?.street}
                    </div>
                    <div className={`mb2 ${handles.field}`}>
                      <span className="b">
                        <FormattedMessage id="store/orderquote.view.label.number" />
                      </span>
                      : {quoteList?.address?.number}
                    </div>
                    <div
                      className={`${handles.field} ${quoteList?.address?.complement ? 'mb2' : 'dn'
                        }`}
                    >
                      <span className="b">
                        <FormattedMessage id="store/orderquote.view.label.complement" />
                      </span>
                      : {quoteList?.address?.complement}
                    </div>
                    <div className={`mb2 ${handles.field}`}>
                      <span className="b">
                        <FormattedMessage id="store/orderquote.view.label.neighborhood" />
                      </span>
                      : {quoteList?.address?.neighborhood}
                    </div>
                    <div className={`mb2 ${handles.field}`}>
                      <span className="b">
                        <FormattedMessage id="store/orderquote.view.label.city" />
                      </span>
                      : {quoteList?.address?.city}
                    </div>
                    <div className={`mb2 ${handles.field}`}>
                      <span className="b">
                        <FormattedMessage id="store/orderquote.view.label.state" />
                      </span>
                      : {quoteList?.address?.state}
                    </div>
                    <div className={`mb2 ${handles.field}`}>
                      <span className="b">
                        <FormattedMessage id="store/orderquote.view.label.postalCode" />
                      </span>
                      : {quoteList?.address?.postalCode}
                    </div>
                    <div className={`mb2 ${handles.field}`}>
                      <span className="b">
                        <FormattedMessage id="store/orderquote.view.label.country" />
                      </span>
                      : {quoteList?.address?.country}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="flex flex-row">
          <div
            className={`flex flex-column w-100 mb5 ${handles.listContainer}`}
          >
            <Table
              fullWidth
              schema={defaultSchema}
              items={quoteList.items}
              loading={loading}
              density="medium"
            />
            <div className={`mt5 ${handles.totalizerContainer}`}>
              <Totalizer items={summary} />
            </div>
          </div>
        </div>
      </div>
      <ModalDialog
        centered
        confirmation={{
          onClick: handleRemoveCart,
          label: translateMessage({
            id: 'store/orderquote.delete.confirmation.yes',
          }),
        }}
        cancelation={{
          onClick: handleModalToggle,
          label: translateMessage({
            id: 'store/orderquote.delete.confirmation.no',
          }),
        }}
        isOpen={isModalOpen}
        onClose={handleModalToggle}
      >
        <h1>
          <FormattedMessage id="store/orderquote.delete.confirmation.title" />
        </h1>
        <p>
          <FormattedMessage id="store/orderquote.delete.confirmation.message" />
        </p>
      </ModalDialog>
    </div>
  )
}

QuoteView.propTypes = {
  SaveCartMutation: PropTypes.func,
  GetSetupConfig: PropTypes.object,
  GetCart: PropTypes.func,
  RemoveCart: PropTypes.func,
  UseCart: PropTypes.func,
}

export default injectIntl(
  compose(
    graphql(removeCart, {
      name: 'RemoveCart',
      options: { ssr: false },
    }),
    graphql(getCart, {
      name: 'GetCart',
      options: { ssr: false },
    }),
    graphql(getSetupConfig, {
      name: 'GetSetupConfig',
      options: { ssr: false },
    }),
    graphql(useCart, {
      name: 'UseCart',
      options: { ssr: false },
    })
  )(QuoteView)
)
