import { useConfigStore } from '@/stores/config';

/**
 * Shared TinyMCE configuration — extracted from LeViewDashboard.vue and Characteristics.vue.
 * Usage:
 *   const { apiKey, init } = useTinymce({ height: 200 })
 *   <Editor v-model="content" :api-key="apiKey" :init="init" />
 */
export function useTinymce(options?: { height?: number }) {
  const apiKey = useConfigStore().config?.tinymce.apiKey ?? '';

  const init = {
    height: options?.height ?? 300,
    menubar: false,
    branding: false,
    statusbar: false,
    plugins:
      'code insertdatetime advlist charmap preview anchor searchreplace visualblocks ' +
      'fullscreen help a11ychecker advcode casechange formatpainter linkchecker ' +
      'autolink lists checklist media mediaembed pageembed permanentpen powerpaste ' +
      'table advtable tinymcespellchecker image link',
    toolbar:
      'help a11ycheck casechange checklist code formatpainter pageembed permanentpen table image',
    toolbar_mode: 'floating' as const,
    force_br_newlines: true,
    relative_urls: false,
    remove_script_host: false,
    images_file_types: 'jpeg,jpg,jpe,jfi,jif,jfif,png,gif,bmp,webp',
    content_style:
      'body { font-family: Figtree, Helvetica, Arial, sans-serif; font-size: 14px }',
    file_picker_types: 'image',

    images_upload_handler(
      blobInfo: { blob: () => Blob; filename: () => string },
      progress: (percent: number) => void,
    ) {
      return new Promise<string>((resolve, reject) => {
        // Convert image to base64 data URL (embedded in HTML)
        // This avoids need for a backend upload endpoint
        const reader = new FileReader();
        
        reader.onload = () => {
          progress(100);
          resolve(reader.result as string);
        };
        
        reader.onerror = () => {
          reject('Failed to read image file');
        };
        
        reader.readAsDataURL(blobInfo.blob());
      });
    },

    file_picker_callback(
      cb: (url: string, meta: { title: string }) => void,
    ) {
      const input = document.createElement('input');
      input.setAttribute('type', 'file');
      input.setAttribute('accept', 'image/*');

      input.onchange = function (this: HTMLInputElement) {
        const file = this.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = () => {
          const id = 'blobid' + new Date().getTime();
          const tinymceWindow = window as typeof window & {
            tinymce: {
              activeEditor: {
                editorUpload: {
                  blobCache: {
                    create: (
                      id: string,
                      file: File,
                      base64: string,
                    ) => { blobUri: () => string };
                    add: (blobInfo: unknown) => void;
                  };
                };
              };
            };
          };
          const blobCache =
            tinymceWindow.tinymce.activeEditor.editorUpload.blobCache;
          const base64 = (reader.result as string).split(',')[1];
          const blobInfo = blobCache.create(id, file, base64);
          blobCache.add(blobInfo);
          cb(blobInfo.blobUri(), { title: file.name });
        };
        reader.readAsDataURL(file);
      };

      input.click();
    },
  };

  return { apiKey, init };
}

/**
 * Inline TinyMCE configuration for single-line fields (e.g. Growth Stage).
 * Blocks Enter key, only allows basic formatting.
 */
export function useTinymceInline() {
  const apiKey = useConfigStore().config?.tinymce.apiKey ?? '';

  const init = {
    menubar: false,
    inline: true,
    valid_elements: 'strong,em,span[style],a[href]',
    valid_styles: {
      '*': 'font-size,font-family,color,text-decoration,text-align',
    },
    toolbar: 'bold italic underline subscript superscript',
    force_br_newlines: false,
    forced_root_block: false as const,
    setup: (editor: {
      on: (event: string, callback: (e: KeyboardEvent) => void) => void;
    }) => {
      editor.on('keydown', (event: KeyboardEvent) => {
        if (event.keyCode === 13) {
          event.preventDefault();
          event.stopPropagation();
        }
      });
    },
  };

  return { apiKey, init };
}
