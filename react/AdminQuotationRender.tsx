//@ts-nocheck
import React, { FC, useState, useEffect } from 'react'
import { Layout, PageBlock, Table, Modal, Button, Tag, PageHeader, Input, Dropdown, Spinner } from 'vtex.styleguide'
import { useRuntime } from 'vtex.render-runtime'
import useCartMutation from './graphql/useCartMutation.graphql'
import removeCartMutation from './graphql/removeCart.graphql'
import { useMutation } from 'react-apollo'

const getStatusColor = (status) => {
  let backgroundColor = 'black';
  if (status === 'Pendente') backgroundColor = 'orange';
  if (status === 'Aprovado') backgroundColor = 'green';
  if (status === 'Rejeitado') backgroundColor = 'red';
  return backgroundColor;
};

const AdminQuotationRender: FC = () => {
  const [quotations, setQuotations] = useState([])
  const [filteredQuotations, setFilteredQuotations] = useState([])
  const [selectedQuotation, setSelectedQuotation] = useState(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [responseComment, setResponseComment] = useState('')
  const [statusFilter, setStatusFilter] = useState('Todos')
  const [searchTerm, setSearchTerm] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const { navigate } = useRuntime()
  const [useCart] = useMutation(useCartMutation)
  const [removeCart] = useMutation(removeCartMutation)

  useEffect(() => {
    fetchQuotations()
  }, [])

  useEffect(() => {
    filterQuotations()
  }, [statusFilter, searchTerm])

  const fetchQuotations = async () => {
    try {
      const response = await fetch(`/api/dataentities/OQ/search?_fields=quotationName,sellerName,isPending,isApproved,isRejected,comment,cartTotal,userEmail,products,id,sellerEmail,orderFormId`)
      if (!response.ok) {
        throw new Error('Erro ao buscar dados')
      }
      const data = await response.json()

      const formattedData = data.map((item: any) => ({
        id: item.id,
        quotationName: item.quotationName,
        sellerName: item.sellerName,
        status: item.isPending ? 'Pendente' : item.isApproved ? 'Aprovado' : item.isRejected ? 'Rejeitado' : 'Desconhecido',
        comment: item.comment,
        cartTotal: item.cartTotal,
        userEmail: item.userEmail,
        sellerEmail: item.sellerEmail,
        products: JSON.parse(item.products),
        orderFormId: item.orderFormId, // Adiciona o orderFormId
      }))

      setQuotations(formattedData)
      setFilteredQuotations(formattedData)
    } catch (error) {
      console.error('Erro:', error)
    }
  }

  const filterQuotations = () => {
    let filteredData = quotations

    if (statusFilter !== 'Todos') {
      filteredData = filteredData.filter((quotation) => quotation.status === statusFilter)
    }

    if (searchTerm) {
      filteredData = filteredData.filter(
        (quotation) =>
          quotation.userEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
          quotation.sellerEmail.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    setFilteredQuotations(filteredData)
  }

  const handleRowClick = (quotation: any) => {
    setSelectedQuotation(quotation)
    setIsModalOpen(true)
    setResponseComment('')
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setSelectedQuotation(null)
  }

  const updateQuotationStatus = async (status: { isApproved: boolean, isRejected: boolean }) => {
    try {
      await fetch(`/api/dataentities/OQ/documents`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/vnd.vtex.ds.v10+json',
        },
        body: JSON.stringify({
          id: selectedQuotation.id,
          ...status,
          isPending: false,
          responseComment: responseComment,
        }),
      })
      fetchQuotations()
    } catch (error) {
      console.error('Erro ao atualizar status:', error)
    }
  }

  const handleUseCart = async (orderFormId) => {
    try {
      // Remove todos os itens do carrinho
      await removeCart({
        variables: {
          id: orderFormId,
        },
      })

      // Adiciona os itens da cotação ao carrinho
      const variables = {
        orderFormId: selectedQuotation.orderFormId,
        items: selectedQuotation.products.map(
          ({ id, quantity, sellingPrice, seller }) => ({
            id,
            quantity,
            sellingPrice: sellingPrice * 100,
            seller,
          })
        ),
      }

      await useCart({
        variables,
      })

      // alert('Cotação aprovada e carrinho atualizado com sucesso!')
      // window.location.replace('/checkout/#/cart')
    } catch (error) {
      console.error('Erro ao usar o carrinho:', error)
    }
  }

  const handleApprove = async () => {
    try {
      setIsLoading(true) // Inicia o carregamento
      await updateQuotationStatus({ isApproved: true, isRejected: false })
      await handleUseCart(selectedQuotation.orderFormId)
      handleCloseModal()
    } catch (error) {
      console.error('Erro ao aprovar e usar o carrinho:', error)
    } finally {
      setIsLoading(false)
    }
  }


  const handleReject = () => {
    updateQuotationStatus({ isApproved: false, isRejected: true })
    handleCloseModal()
  }

  const handleCreateQuotation = () => {
    navigate({ to: '/orderquote/create' })
  }

  const statusOptions = [
    { label: 'Todos', value: 'Todos' },
    { label: 'Pendente', value: 'Pendente' },
    { label: 'Aprovado', value: 'Aprovado' },
    { label: 'Rejeitado', value: 'Rejeitado' },
  ]

  const tableSchema = {
    properties: {
      quotationName: {
        title: 'Nome da Cotação',
      },
      userEmail: {
        title: 'Email do Usuário',
      },
      sellerEmail: {
        title: 'Email do vendedor',
      },
      cartTotal: {
        title: 'Valor Total do Carrinho',
        cellRenderer: ({ cellData }: { cellData: number }) => {
          return <span>R$ {cellData.toFixed(2)}</span>
        },
      },
      status: {
        title: 'Status',
        cellRenderer: ({ cellData }: { cellData: string }) => {
          let backgroundColor = getStatusColor(cellData)
          return <Tag color="white" bgColor={backgroundColor}>{cellData}</Tag>
        },
      },
    },
  }

  return (
    <Layout fullWidth>
      <PageHeader title="Gestão de Cotações" />
      <PageBlock variation="full" style={{ backgroundColor: '#FFFFFF' }}>
        <div style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
              <Dropdown
                label="Filtrar por Status"
                options={statusOptions}
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                placeholder="Selecione o status"
              />
            </div>
          </div>
        </div>

        {filteredQuotations.length > 0 ? (
          <Table
            fullWidth
            schema={tableSchema}
            items={filteredQuotations}
            density="low"
            onRowClick={({ rowData }: { rowData: any }) => handleRowClick(rowData)}
            emptyStateLabel="Nenhuma cotação encontrada"
            containerClass="w-100"
            style={{ width: '100%' }}
          />
        ) : (
          <div>Nenhuma cotação encontrada</div>
        )}
      </PageBlock>

      {isModalOpen && selectedQuotation && (
        <Modal
          centered
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          title={`Cotação: ${selectedQuotation.quotationName}`}
          style={{ width: '80%', maxWidth: '800px' }}
        >
          <div>
            <p><strong>Vendedor:</strong> {selectedQuotation.sellerEmail}</p>
            <p><strong>Status:</strong> <span style={{ color: 'white', backgroundColor: getStatusColor(selectedQuotation.status), padding: '2px 6px', borderRadius: '4px' }}>{selectedQuotation.status}</span></p>
            <p><strong>Total do Carrinho:</strong> ${selectedQuotation.cartTotal}</p>
            <p><strong>Comentário:</strong> {selectedQuotation.comment}</p>
            <p><strong>Email do Usuário:</strong> {selectedQuotation.userEmail}</p>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {selectedQuotation.products.map((product: any) => (
                <div key={product.id} style={{ display: 'flex', marginBottom: '20px' }}>
                  <img src={product.imageUrl} alt={product.name} style={{ width: '100px', marginRight: '20px', height: '100px' }} />
                  <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', flexDirection: 'row' }}>
                      <p style={{ marginRight: '20px', maxWidth: '320px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        <strong>Nome:</strong> {product.name}
                      </p>
                      <p><strong>ID:</strong> {product.productId}</p>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'row' }}>
                      <p style={{ marginRight: '20px' }}><strong>Quantidade:</strong> {product.quantity}</p>
                      <p><strong>Total:</strong> ${product.sellingPrice * product.quantity}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Input
            label="Comentário de Resposta"
            value={responseComment}
            onChange={(e) => setResponseComment(e.target.value)}
            placeholder="Escreva seu comentário aqui"
          />

          {isLoading ? (
            <Spinner />
          ) : (
            <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <Button variation="danger" onClick={handleReject}>Rejeitar</Button>
              <Button variation="primary" onClick={handleApprove}>Aprovar</Button>
            </div>
          )}
        </Modal>
      )}
    </Layout>
  )
}

export default AdminQuotationRender
