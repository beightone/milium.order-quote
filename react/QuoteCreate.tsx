//@ts-nocheck

import React, { useState, useContext, useEffect } from 'react'
import { Input, Textarea, Button, Table, Totalizer, ToastContext, Checkbox, PageHeader, } from 'vtex.styleguide'
import axios from 'axios'
import { useCssHandles } from 'vtex.css-handles'
import type { ChildDataProps } from 'react-apollo'
import { compose, graphql } from 'react-apollo'
import { FormattedCurrency } from 'vtex.format-currency'
import { useRuntime, Loading } from 'vtex.render-runtime'
import type { WrappedComponentProps, MessageDescriptor } from 'react-intl'
import { injectIntl, FormattedMessage } from 'react-intl'

import { getSession } from './modules/session'
import saveCartMutation from './graphql/saveCart.graphql'
import clearCartMutation from './graphql/clearCartMutation.graphql'
import getOrderForm from './queries/orderForm.gql'
import getSetupConfig from './graphql/getSetupConfig.graphql'
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

let isAuthenticated =
  JSON.parse(String(localStore.getItem('orderquote_isAuthenticated'))) ?? false

const CSS_HANDLES = [
  'containerCreate',
  'inputCreate',
  'buttonsContainer',
  'checkboxClear',
  'buttonSave',
  'listContainer',
  'descriptionContainer',
  'notAuthenticatedMessage',
  'itemNameContainer',
  'itemName',
  'itemSkuName',
  'totalizerContainer',
] as const

type ChildProps = ChildDataProps<
  WrappedComponentProps,
  {
    orderForm?: OrderForm | null
  }
>

const QuoteCreate: StorefrontFunctionComponent<
  ChildProps & {
    SaveCartMutation?: any
    ClearCartMutation?: any
  }
> = ({ SaveCartMutation, ClearCartMutation, intl, data }) => {
  const { loading, error, orderForm } = data ?? {}
  const {
    totalizers = [],
    value = 0,
    customData,
    shippingData,
    items: initialItems = [],
    sellers = [],
    orderFormId = '',
  } = orderForm ?? {}

  const [_state, setState] = useState<any>({
    name: '',
    description: '',
    errorMessage: '',
    savingQuote: false,
    clearCart: false,
    items: [],
    totalizers: []
  })

  const { navigate } = useRuntime()

  const { showToast } = useContext(ToastContext)
  const sessionResponse: any = useSessionResponse()
  const handles = useCssHandles(CSS_HANDLES)

  useEffect(() => {
    // Clonando os items do orderForm para o estado inicial
    setState(prevState => ({
      ...prevState,
      items: initialItems.map(item => ({ ...item })),
    }))
  }, [initialItems])

  if (sessionResponse) {
    isAuthenticated =
      sessionResponse?.namespaces?.profile?.isAuthenticated?.value === 'true'

    localStore.setItem(
      'orderquote_isAuthenticated',
      JSON.stringify(isAuthenticated)
    )
  }

  const { name, description, savingQuote, errorMessage, clearCart, items } = _state

  useEffect(() => {
    console.log('@@_state', _state)
  }, [_state])

  const translateMessage = (message: MessageDescriptor) => {
    return intl.formatMessage(message)
  }

  const toastMessage = (messsageKey: string) => {
    const message = translateMessage({
      id: messsageKey,
    })

    const action = undefined

    showToast({ message, action })
  }

  const updatePrice = (itemId: string, newPrice: number) => {
    const updatedItems = items.map(item => {
      if (item.id === itemId) {
        return { ...item, sellingPrice: newPrice }
      }
      return item
    })

    // Recalcular o subtotal com os novos preços
    const newSubtotal = updatedItems.reduce(
      (acc, item) => acc + item.sellingPrice * item.quantity,
      0
    )

    // Recalcular o valor total incluindo outros totalizadores
    const newTotal = newSubtotal + shippingCost + taxes - discounts

    // Atualizando o estado com os novos items, subtotal e total
    setState((prevState: any) => ({
      ...prevState,
      items: updatedItems,
      totalizers: [
        ...prevState.totalizers.filter(t => t.id !== 'Items' && t.id !== 'Total'),
        { id: 'Items', name: 'Subtotal', value: newSubtotal },
        { id: 'Total', name: 'Total', value: newTotal },
      ],
    }))
  }

  const defaultSchema = {
    properties: {
      refId: {
        title: translateMessage({
          id: 'store/orderquote.cartList.label.sku',
        }),
        width: 200,
      },
      skuName: {
        title: translateMessage({
          id: 'store/orderquote.cartList.label.itemName',
        }),
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
        minWidth: 300,
      },
      sellingPrice: {
        title: translateMessage({
          id: 'store/orderquote.cartList.label.price',
        }),
        headerRight: true,
        cellRenderer: ({ rowData }: any) => {
          return (
            <Input
              type="number"
              value={rowData.sellingPrice}
              onChange={(e: any) => {
                const newPrice = parseFloat(e.target.value)
                updatePrice(rowData.id, newPrice)
              }}
            />
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
        cellRenderer: ({ rowData }: any) => {
          return (
            <span className="tr w-100">
              <FormattedCurrency
                value={rowData.sellingPrice * rowData.quantity}
              />
            </span>
          )
        },
        width: 300,
      },
    },
  }


  console.log('@@totalizers', totalizers);

  const { value: subtotal = 0 } =
    (_state.totalizers && _state.totalizers.find(({ id }) => id === "Items")) ?? {}

  const { value: total = value } =
    (_state.totalizers && _state.totalizers.find(({ id }) => id === 'Total')) ?? {}

  const { value: discounts = 0 } =
    (_state.totalizers && _state.totalizers.find(({ id }) => id === 'Discounts')) ?? {}

  const { value: shippingCost = 0 } =
    (_state.totalizers && _state.totalizers.find(({ id }) => id === 'Shipping')) ?? {}

  const nonTaxes = ['Shipping', 'Items', 'Discounts']
  let taxes = 0

  totalizers.forEach((item) => {
    if (nonTaxes.indexOf(item.id) === -1) {
      taxes += item.value
    }
  })

  const summary = [
    {
      label: translateMessage({
        id: 'store/orderquote.summary.subtotal',
      }),
      value: <FormattedCurrency value={subtotal} />,
      isLoading: false,
    },
    // {
    //   label: translateMessage({
    //     id: 'store/orderquote.summary.shipping',
    //   }),
    //   value: <FormattedCurrency value={shippingCost / 100} />,
    //   isLoading: false,
    // },
    {
      label: translateMessage({
        id: 'store/orderquote.summary.discounts',
      }),
      value: <FormattedCurrency value={discounts / 100} />,
      isLoading: false,
    },
    // {
    //   label: translateMessage({
    //     id: 'store/orderquote.summary.taxes',
    //   }),
    //   value: <FormattedCurrency value={taxes / 100} />,
    //   isLoading: false,
    // },
    {
      label: translateMessage({
        id: 'store/orderquote.summary.total',
      }),
      value: <FormattedCurrency value={total} />,
      isLoading: false,
    },
  ]

  const activeLoading = (status: boolean) => {
    setState({ ..._state, savingQuote: status })
  }

  const handleSaveCart = async () => {
    if (!items.length) return

    if (!isAuthenticated) {
      toastMessage('store/orderquote.error.notAuthenticated')
      return
    }

    if (!name) {
      setState({
        ..._state,
        errorMessage: translateMessage({
          id: 'store/orderquote.create.required',
        }),
      })
      return
    }

    const { address } = shippingData ?? {}

    const {
      city,
      complement,
      country,
      neighborhood,
      number,
      postalCode,
      state,
      street,
    } = address ?? {}

    const encodeCustomData = (orderFormCustomData: any) => {
      if (orderFormCustomData?.customApps?.length) {
        return {
          customApps: orderFormCustomData.customApps.map((item: any) => {
            return {
              fields: JSON.stringify(item.fields),
              id: item.id,
              major: item.major,
            }
          }),
        }
      }
      return null
    }

    //@ts-ignore
    const sellerEmail = document.querySelector('.vtex-telemarketing-2-x-attendantEmail').textContent.split(': ')[1];

    const dataEntityPayload = {
      name,
      cartTotal: _state.totalizers[1].value,
      isApproved: false,
      isPending: true,
      isRejected: false,
      orderFormId,
      products: JSON.stringify(_state.items),
      quotationName: name,
      sellerName: sellers.map(seller => seller.name).join(', '),
      userEmail: sessionResponse.namespaces.profile.email.value,
      sellerEmail,
      comment: description
    }

    console.log('@@dataEntityPayload', dataEntityPayload);

    try {
      // Requisição para salvar os dados na data entity OQ
      const response = await axios.post('/api/dataentities/OQ/documents', dataEntityPayload, {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/vnd.vtex.ds.v10+json',
        }
      })

      console.log('Data saved successfully:', response.data)

      // Salvar o carrinho na VTEX
      await Promise.all(
        sellers.map(seller => {
          const sellerItems = items.filter(
            ({ seller: sellerId }) => sellerId === seller.id
          )

          const sellerTotal = sellerItems.reduce<number>((prev, curr) => {
            const { quantity, sellingPrice, listPrice, price } = curr
            const actualPrice = sellingPrice ?? price ?? listPrice ?? 0
            const itemTotal = actualPrice * (quantity ?? 1)

            return prev + itemTotal
          }, 0)

          const cart = {
            id: null,
            email: sessionResponse.namespaces.profile.email.value,
            cartName: `${name} (seller ${seller.name})`,
            description,
            items: _state.items
              .map(({ listPrice, price, sellingPrice, seller: sellerName, ...item }) => ({
                ...item,
                listPrice: parseInt(String(listPrice * 100), 0),
                price: parseInt(String(price * 100), 0),
                sellingPrice: parseInt(String(sellingPrice * 100), 0),
                seller: sellerName,
              })),
            creationDate: new Date().toISOString(),
            total: _state.items
              .filter(item => item.seller === seller.id)
              .reduce((acc, item) => acc + item.sellingPrice * item.quantity, 0), // Calcular o total atualizado
            customData: encodeCustomData(customData),
            seller: seller.id,
            address: shippingData?.address
              ? {
                city,
                complement,
                country,
                neighborhood,
                number,
                postalCode,
                state,
                street,
              }
              : null,
          }

          return SaveCartMutation({
            variables: {
              cart,
            },
          })
        })
      )

      toastMessage('store/orderquote.create.success')
      if (clearCart) {
        await ClearCartMutation({
          variables: {
            orderFormId,
          },
        })
      }

      navigate({
        page: 'store.orderquote',
        fallbackToWindowLocation: true,
        fetchPage: true,
      })
    } catch (error) {
      console.error('Error saving data:', error)
      toastMessage('store/orderquote.create.error')
    } finally {
      activeLoading(false)
    }
  }

  if (error) return null

  if (loading) return <Loading />

  useEffect(() => {
    console.log({ orderForm, sellers, items })
  }, [orderForm, sellers, items])

  return (
    <div className={`${handles.containerCreate} pv6 ph4 mw9 center`}>
      <PageHeader
        title={translateMessage({
          id: 'store/orderquote.create.title',
        })}
        linkLabel={translateMessage({
          id: 'store/orderquote.button.back',
        })}
        onLinkClick={() => {
          navigate({
            to: '/orderquote',
          })
        }}
      />

      {!isAuthenticated && (
        <div className="flex flex-row ph5 ph7-ns">
          <div className="flex flex-column w-100">
            <div className={`mb5 ${handles.notAuthenticatedMessage}`}>
              <FormattedMessage id="store/orderquote.error.notAuthenticated" />
            </div>
          </div>
        </div>
      )}

      {isAuthenticated && (
        <div>
          <div className="flex flex-column ph5 ph7-ns">
            <div className={`${handles.inputCreate} mb5 flex flex-column`}>
              <Input
                placeholder={translateMessage({
                  id: 'store/orderquote.placeholder.quotationName',
                })}
                dataAttributes={{ 'hj-white-list': true, test: 'string' }}
                label={translateMessage({
                  id: 'store/orderquote.create.nameLabel',
                })}
                value={name}
                errorMessage={errorMessage}
                onChange={(e: any) => {
                  setState({ ..._state, name: e.target.value })
                }}
              />
            </div>
          </div>
          <div className="flex flex-row ph5 ph7-ns">
            <div
              className={`flex flex-column w-100 mb5 ${handles.descriptionContainer}`}
            >
              <Textarea
                label={translateMessage({
                  id: 'store/orderquote.create.descriptionLabel',
                })}
                onChange={(e: any) =>
                  setState({ ..._state, description: e.target.value })
                }
                value={description}
                characterCountdownText={
                  <FormattedMessage
                    id="store/orderquote.create.characterLeft"
                    values={{ count: _state.description.length }}
                  />
                }
                maxLength="100"
                rows="2"
              />
            </div>
          </div>
          <div className="flex flex-row ph5 ph7-ns">
            <div
              className={`flex flex-column w-100 mb5 ${handles.listContainer}`}
            >
              <Table
                fullWidth
                schema={defaultSchema}
                items={items}
                density="medium"
                updatePrice={updatePrice}
              />
            </div>
          </div>

          {/* Container Subtotal/descontos/total */}

          <div className="flex flex-row ph5 ph7-ns">
            <div
              className={`flex flex-column w-100 mb5  ${handles.totalizerContainer}`}
            >
              <Totalizer items={summary} />
            </div>
          </div>

          {/* Container criar e limpar o carrinho */}
          <div
            className={`${handles.buttonsContainer} mb5 flex flex-column items-end pt6`}
          >
            <p style={{ margin: '8px' }}>Observação: Devido aos nossos estoques serem limitados este orçamento não garante a reserva do produto.</p>

            <div className="flex flex-row">
              <div
                className={`flex flex-column w-70 pt4 ${handles.checkboxClear}`}
              >
                <Checkbox
                  checked={clearCart}
                  id="clear"
                  label={translateMessage({
                    id: 'store/orderquote.button.clear',
                  })}
                  name="clearCheckbox"
                  onChange={() => {
                    setState({ ..._state, clearCart: !clearCart })
                  }}
                  value="option-0"
                />
              </div>
              <div className={`flex flex-column w-30 ${handles.buttonSave}`}>
                <Button
                  variation="primary"
                  isLoading={savingQuote}
                  onClick={handleSaveCart}
                >
                  <FormattedMessage id="store/orderquote.button.save" />
                </Button>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  )
}

interface OrderForm {
  orderFormId: string
  salesChannel: string
  loggedIn: boolean
  allowManualPrice: boolean
  userType: string | null
  value: number
  items: OrderFormItem[]
  totalizers: Totalizers[]
  shippingData: ShippingData | null
  clientProfileData: ClientProfileData
  sellers: Seller[]
  customData: CustomData
}

type CustomData = {
  customApps: CustomApps[]
} | null

type CustomApps = {
  id: string
  major: string
  fields: string
}

interface ClientProfileData {
  email: string
}

interface OrderFormItem {
  name: string
  skuName: string
  refId: string
  id: string
  productId: string
  imageUrl: string
  listPrice: number
  price: number
  quantity: number
  sellingPrice: number
  seller: string
}

interface Seller {
  id: string
  name: string
}

interface ShippingData {
  address?: Address | null
}

interface Address {
  street: string | null
  number: string | null
  complement: string | null
  postalCode: string | null
  city: string | null
  geoCoordinates: number[] | null
  neighborhood: string | null
  country: string | null
  state: string | null
}

interface Totalizers {
  id: string
  name: string
  value: number
}

export default injectIntl(
  compose(
    graphql<any, OrderForm, any, ChildProps>(getOrderForm, {
      options: { ssr: false },
    }),
    graphql(saveCartMutation, {
      name: 'SaveCartMutation',
      options: { ssr: false },
    }),
    graphql(clearCartMutation, {
      name: 'ClearCartMutation',
      options: { ssr: false },
    }),
    graphql(getSetupConfig, {
      name: 'GetSetupConfig',
      options: { ssr: false },
    })
  )(QuoteCreate)
)
