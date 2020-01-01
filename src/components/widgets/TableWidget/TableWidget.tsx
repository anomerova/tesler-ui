import React from 'react'
import {connect} from 'react-redux'
import {Dispatch} from 'redux'
import {Table, Dropdown} from 'antd'
import {ColumnProps, TableRowSelection} from 'antd/es/table'
import ActionLink from '../../ui/ActionLink/ActionLink'
import {$do} from '../../../actions/actions'
import {Store} from '../../../interfaces/store'
import {WidgetListField, WidgetTableMeta} from '../../../interfaces/widget'
import {RowMetaField} from '../../../interfaces/rowMeta'
import {DataItem, MultivalueSingleValue, PendingDataItem} from '../../../interfaces/data'
import {buildBcUrl} from '../../../utils/strings'
import * as styles from './TableWidget.less'
import {FieldType, ViewSelectedCell} from '../../../interfaces/view'
import Field, {emptyMultivalue} from '../../Field/Field'
import MultivalueHover from '../../ui/Multivalue/MultivalueHover'
import {Operation, OperationGroup} from '../../../interfaces/operation'
import ColumnTitle from '../../ColumnTitle/ColumnTitle'
import cn from 'classnames'
import Pagination from '../../ui/Pagination/Pagination'
import {PaginationMode} from '../../../interfaces/widget'
import HierarchyTable from '../../../components/HierarchyTable/HierarchyTable'
import RowOperations from './RowOperations'
import {useTranslation} from 'react-i18next'

interface TableWidgetOwnProps {
    meta: WidgetTableMeta,
    rowSelection?: TableRowSelection<DataItem>,
    showRowActions?: boolean,
    allowEdit?: boolean,
    paginationMode?: PaginationMode,
    disablePagination?: boolean
}

interface TableWidgetProps extends TableWidgetOwnProps {
    data: DataItem[],
    rowMetaFields: RowMetaField[],
    limitBySelf?: boolean,
    cursor: string,
    selectedCell: ViewSelectedCell,
    pendingDataItem: PendingDataItem,
    hasNext?: boolean,
    onDrillDown: (widgetName: string, bcName: string, cursor: string, fieldKey: string) => void,
    onShowAll: (bcName: string, cursor: string) => void,

    onSelectRow: (bcName: string, cursor: string) => void,
    onSelectCell: (cursor: string, widgetName: string, fieldKey: string) => void,
    /**
     * @deprecated Use meta.bcName directly from ownProps instead; TODO: Remove in 2.0.0
     */
    bcName?: string
    /**
     * @deprecated Use RowOperations component instead; TODO: Remove in 2.0.0
     */
    onOperationClick?: (bcName: string, operationType: string, widgetName: string) => void,
    /**
     * @deprecated Use RowOperations component instead; TODO: Remove in 2.0.0
     */
    operations?: Array<Operation | OperationGroup>,
}

export function TableWidget(props: TableWidgetProps) {

    const {t} = useTranslation()

    if (props.meta.options && props.meta.options.hierarchy) {
        return <HierarchyTable
            meta={props.meta}
            showPagination
        />
    }

    // Набор рефов для работы меню операций строки
    const floatMenuRef = React.useRef(null)
    const tableContainerRef = React.useRef(null)
    const tableBodyRef = React.useRef(null)
    const floatMenuHoveredRecord = React.useRef('')
    const [showRowOperations, setShowRowOperations] = React.useState(false)
    const mouseAboveRow = React.useRef(false)
    const expectedFloatMenuTopValue = React.useRef('') // положение меню, которое должно быть выставлено после закрытия

    const onTableMouseEnter = React.useCallback(
        () => {
            if (floatMenuRef.current) {
                floatMenuRef.current.classList.add(styles.showMenu)
            }
        },
        []
    )

    const onTableMouseLeave = React.useCallback(
        (event: React.MouseEvent<HTMLElement>) => {
            if (!showRowOperations && floatMenuRef.current) {
                if (event.relatedTarget) {
                    let checkElement = event.relatedTarget as HTMLElement
                    while (checkElement) {
                        if (checkElement === floatMenuRef.current) {
                            return
                        }
                        checkElement = checkElement.parentElement
                    }
                }

                floatMenuRef.current.classList.remove(styles.showMenu)
            }
        },
        []
    )

    const onFloatMenuMouseLeave = React.useCallback(
        (event: React.MouseEvent<HTMLElement>) => {
            if (!showRowOperations && tableBodyRef.current) {
                if (event.relatedTarget) {
                    let checkElement = event.relatedTarget as HTMLElement
                    while (checkElement) {
                        if (checkElement === tableBodyRef.current) {
                            return
                        }
                        checkElement = checkElement.parentElement
                    }
                }

                floatMenuRef.current.classList.remove(styles.showMenu)
            }
        },
        []
    )

    React.useEffect(() => {
        if (tableContainerRef.current) {
            const table = tableContainerRef.current.querySelector('.ant-table-tbody')
            if (table) {
                tableBodyRef.current = table
                if (!table.onmouseenter) {
                    table.onmouseenter = onTableMouseEnter
                }
                if (!table.onmouseleave) {
                    table.onmouseleave = onTableMouseLeave
                }
            }
        }
    }, [])

    const onTableRow = React.useCallback(
        (record, index) => {
            return {
                onMouseEnter: (event: React.MouseEvent<HTMLElement>) => {
                    mouseAboveRow.current = true

                    if (!floatMenuRef.current || !tableContainerRef.current) {
                        return
                    }

                    const tableRow = event.currentTarget
                    const tableContainerRect = tableContainerRef.current.getBoundingClientRect()
                    const tableRowRect = tableRow.getBoundingClientRect()

                    const floatMenuTopValue = `${tableRowRect.top - tableContainerRect.top + 17}px`
                    expectedFloatMenuTopValue.current = floatMenuTopValue

                    if (!showRowOperations) {
                        floatMenuRef.current.style.top = floatMenuTopValue
                        floatMenuHoveredRecord.current = record.id
                    }
                },
                onMouseLeave: () => {
                    mouseAboveRow.current = false
                }
            }
        },
        []
    )

    const onMenuVisibilityChange = React.useCallback(
        (visibility: boolean) => {
            setShowRowOperations(visibility)
            if (visibility) {
                if (floatMenuHoveredRecord.current && floatMenuHoveredRecord.current !== props.cursor) {
                    props.onSelectRow(props.meta.bcName, floatMenuHoveredRecord.current)
                }
            } else {
                if (!mouseAboveRow.current) {
                    floatMenuRef.current.classList.remove(styles.showMenu)
                } else if (expectedFloatMenuTopValue.current) {
                    floatMenuRef.current.style.top = expectedFloatMenuTopValue.current
                }
            }
        },
        [props.cursor, props.onSelectRow, props.meta.bcName, props.meta.name]
    )

    const processCellClick = (recordId: string, fieldKey: string) => {
        props.onSelectCell(recordId, props.meta.name, fieldKey)
    }

    const columns: Array<ColumnProps<DataItem>> = props.meta.fields.map((item: WidgetListField) => {
        const fieldRowMeta = props.rowMetaFields && props.rowMetaFields.find(field => field.key === item.key)
        return {
            title: <ColumnTitle
                widgetName={props.meta.name}
                widgetMeta={item}
                rowMeta={fieldRowMeta}
            />,
            key: item.key,
            dataIndex: item.key,
            width: item.width,
            render: (text, dataItem) => {
                if (item.type === FieldType.multivalue) {
                    return <MultivalueHover
                        data={(dataItem[item.key] || emptyMultivalue) as MultivalueSingleValue[]}
                        displayedValue={item.displayedKey && dataItem[item.displayedKey]}
                    />
                }

                const editMode = props.allowEdit && (props.selectedCell && item.key === props.selectedCell.fieldKey
                    && props.meta.name === props.selectedCell.widgetName && dataItem.id === props.selectedCell.rowId
                    && props.cursor === props.selectedCell.rowId
                )

                return <div>
                    <Field
                        data={dataItem}
                        bcName={props.meta.bcName}
                        cursor={dataItem.id}
                        widgetName={props.meta.name}
                        widgetFieldMeta={item}
                        readonly={!editMode}
                        forceFocus={editMode}
                    />
                </div>
            },
            onCell: (record, rowIndex) => {
                return (!props.allowEdit || item.drillDown)
                    ? null
                    : {
                        onDoubleClick: (event) => {
                            processCellClick(record.id, item.key)
                        }
                    }
            }
        }
    })

    const handleShowAll = () => {
        props.onShowAll(props.meta.bcName, props.cursor)
    }

    const handleOperation = React.useCallback(() => {
        setShowRowOperations(false)
    }, [])

    return <div
        className={styles.tableContainer}
        ref={tableContainerRef}
    >
        { props.limitBySelf &&
            <ActionLink onClick={handleShowAll}>
                {t('Show other records')}
            </ActionLink>
        }
        <Table
            className={cn(
                styles.table,
                {[styles.tableWithRowMenu]: props.showRowActions}
            )}
            columns={columns}
            dataSource={props.data}
            rowKey="id"
            rowSelection={props.rowSelection}
            pagination={false}
            onRow={(props.showRowActions) ? onTableRow : null}
        />
        {!props.disablePagination && <Pagination bcName={props.meta.bcName} mode={props.paginationMode || PaginationMode.page} />}
        {(props.showRowActions) &&
        <div
            ref={floatMenuRef}
            className={styles.floatMenu}
            onMouseLeave={onFloatMenuMouseLeave}
        >
            <Dropdown
                placement="bottomRight"
                trigger={['click']}
                onVisibleChange={onMenuVisibilityChange}
                overlay={<RowOperations widgetMeta={props.meta} onClick={handleOperation} />}
                getPopupContainer={trigger => trigger.parentElement}
            >
                <div className={styles.dots}>...</div>
            </Dropdown>
        </div>
        }
    </div>
}

function mapStateToProps(store: Store, ownProps: TableWidgetOwnProps) {
    const bcName = ownProps.meta.bcName
    const bcUrl = buildBcUrl(bcName, true)
    const fields = bcUrl
        && store.view.rowMeta[bcName]
        && store.view.rowMeta[bcName][bcUrl]
        && store.view.rowMeta[bcName][bcUrl].fields
    const bc = store.screen.bo.bc[bcName]
    const cursor = bc && bc.cursor
    const hasNext = bc && bc.hasNext
    const limitBySelf = cursor && store.router.bcPath && store.router.bcPath.includes(`${bcName}/${cursor}`)

    return {
        data: store.data[ownProps.meta.bcName],
        rowMetaFields: fields,
        limitBySelf,
        bcName,
        cursor,
        hasNext,
        selectedCell: store.view.selectedCell,
        pendingDataItem: cursor && store.view.pendingDataChanges[bcName] && store.view.pendingDataChanges[bcName][cursor]
    }
}

function mapDispatchToProps(dispatch: Dispatch) {
    return {
        onSelectCell: (cursor: string, widgetName: string, fieldKey: string) => {
            dispatch($do.selectTableCellInit({ widgetName, rowId: cursor, fieldKey }))
        },
        onShowAll: (bcName: string, cursor: string) => {
            dispatch($do.showAllTableRecordsInit({ bcName, cursor }))
        },
        onDrillDown: (widgetName: string, cursor: string, bcName: string, fieldKey: string) => {
            dispatch($do.userDrillDown({widgetName, cursor, bcName, fieldKey}))
        },
        onSelectRow: (bcName: string, cursor: string) => {
            dispatch($do.bcSelectRecord({ bcName, cursor }))
        },
    }
}

export default connect(mapStateToProps, mapDispatchToProps)(TableWidget)
