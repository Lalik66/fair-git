import React, { forwardRef, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAdminSearchQuery, useAdminSearchSetter } from '../../hooks/useAdminSearch';

interface AdminSearchBoxProps {
  placeholder?: string;
}

const AdminSearchBox = forwardRef<HTMLInputElement, AdminSearchBoxProps>(
  ({ placeholder }, ref) => {
    const { t } = useTranslation();
    const urlQuery = useAdminSearchQuery();
    const setUrlQuery = useAdminSearchSetter();
    const [value, setValue] = useState(urlQuery);

    useEffect(() => {
      setValue(urlQuery);
    }, [urlQuery]);

    const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setValue(e.target.value);
      setUrlQuery(e.target.value);
    };

    return (
      <div className="search">
        <span style={{ fontSize: '14px' }}>{'⌕'}</span>
        <input
          ref={ref}
          value={value}
          onChange={onChange}
          placeholder={placeholder ?? t('common.search', 'Search...')}
        />
        <span className="kbd">{'⌘'}K</span>
      </div>
    );
  }
);

AdminSearchBox.displayName = 'AdminSearchBox';

export default AdminSearchBox;
